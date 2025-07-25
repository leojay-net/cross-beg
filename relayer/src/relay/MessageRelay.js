/**
 * Message Relay Module
 * Handles the actual relaying of cross-chain messages
 */

const { ethers } = require('ethers');
const { getChainKeyById, getChainConfig } = require('../config/chains');
const { DEFAULT_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

class MessageRelay {
    constructor(providerManager, messageQueue) {
        this.providerManager = providerManager;
        this.messageQueue = messageQueue;
        this.stats = {
            messagesRelayed: 0,
            failedRelays: 0,
            gasUsed: 0,
            startTime: Date.now()
        };
        this.isRunning = false;
    }

    /**
     * Start the message relay processor
     */
    start() {
        if (this.isRunning) {
            logger.warn('⚠️ Message relay is already running');
            return;
        }

        this.isRunning = true;
        this.startMessageProcessor();
        this.startRetryProcessor();

        logger.info('🚀 Message relay processor started');
    }

    /**
     * Stop the message relay processor
     */
    stop() {
        this.isRunning = false;
        logger.info('🛑 Message relay processor stopped');
    }

    /**
     * Start the main message processing loop
     */
    startMessageProcessor() {
        const processingInterval = parseInt(process.env.MESSAGE_PROCESSING_INTERVAL) || DEFAULT_CONFIG.MESSAGE_PROCESSING_INTERVAL;

        const processLoop = async () => {
            if (!this.isRunning) return;

            if (!this.messageQueue.isEmpty() && !this.messageQueue.isProcessing) {
                this.messageQueue.startProcessing();

                const message = this.messageQueue.getNextMessage();
                if (message) {
                    const success = await this.relayMessage(message);
                    
                    // Mark chain processing as complete
                    if (message.targetChain) {
                        this.messageQueue.markChainProcessingComplete(message.targetChain, success);
                    }
                }

                this.messageQueue.completeProcessing();
            }

            setTimeout(processLoop, processingInterval);
        };

        processLoop();
        logger.info(`🔄 Message processor started (interval: ${processingInterval}ms)`);
    }

    /**
     * Start the retry queue processor
     */
    startRetryProcessor() {
        const retryInterval = parseInt(process.env.RETRY_CHECK_INTERVAL) || DEFAULT_CONFIG.RETRY_CHECK_INTERVAL;

        const retryLoop = () => {
            if (!this.isRunning) return;

            this.messageQueue.processRetryQueue();
            setTimeout(retryLoop, retryInterval);
        };

        setTimeout(retryLoop, retryInterval);
        logger.info(`🔄 Retry processor started (interval: ${retryInterval}ms)`);
    }

    /**
     * Relay a single message to the target chain
     * @param {Object} message - Message to relay
     * @returns {Promise<boolean>} True if successful, false otherwise
     */
    async relayMessage(message) {
        try {
            const targetChainKey = getChainKeyById(message.targetChain);
            if (!targetChainKey) {
                logger.error(`❌ Unknown target chain ID: ${message.targetChain}`);
                return false;
            }

            const targetConfig = getChainConfig(targetChainKey);

            // Check if target chain is ready
            if (!this.providerManager.isChainReady(targetChainKey)) {
                logger.error(`❌ Target chain not ready: ${targetChainKey}`);
                this.messageQueue.addToRetryQueue(message);
                return false;
            }

            // Check if message is expired
            if (Date.now() / 1000 > message.expiryTime) {
                logger.warn(`⏰ Message expired, skipping relay: ${message.requestId}`);
                return false;
            }

            logger.info(`🚀 Relaying message to ${targetConfig.name}...`, {
                requestId: message.requestId,
                attempt: (message.retryCount || 0) + 1
            });

            // Get contract with signer
            const contractWithSigner = this.providerManager.getContractWithSigner(targetChainKey);
            if (!contractWithSigner) {
                logger.error(`❌ No contract with signer for ${targetChainKey}`);
                this.messageQueue.addToRetryQueue(message);
                return false;
            }

            // Estimate gas
            const gasEstimate = await contractWithSigner.receiveMessage.estimateGas(
                message.requestId,
                message.requester,
                message.target,
                message.amount,
                message.token,
                message.originChain,
                message.message,
                message.timestamp,
                message.expiryTime,
                message.messageHash
            );

            const gasLimit = gasEstimate * BigInt(Math.floor(targetConfig.gasMultiplier * 100)) / BigInt(100);

            // Send transaction
            const tx = await contractWithSigner.receiveMessage(
                message.requestId,
                message.requester,
                message.target,
                message.amount,
                message.token,
                message.originChain,
                message.message,
                message.timestamp,
                message.expiryTime,
                message.messageHash,
                { gasLimit }
            );

            logger.info(`📤 Message relay transaction sent`, {
                requestId: message.requestId,
                txHash: tx.hash,
                targetChain: targetConfig.name
            });

            // Wait for confirmation
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                logger.info(`✅ Message successfully relayed`, {
                    requestId: message.requestId,
                    txHash: tx.hash,
                    targetChain: targetConfig.name,
                    gasUsed: receipt.gasUsed.toString()
                });

                this.stats.messagesRelayed++;
                this.stats.gasUsed += Number(receipt.gasUsed);
                return true;
            } else {
                throw new Error('Transaction failed');
            }

        } catch (error) {
            logger.error(`❌ Failed to relay message`, {
                requestId: message.requestId,
                error: error.message,
                retryCount: message.retryCount || 0
            });

            this.stats.failedRelays++;
            this.messageQueue.recordProcessingError();

            // Handle specific error types
            if (this.isRetryableError(error)) {
                this.messageQueue.addToRetryQueue(message);
            } else {
                logger.error(`💀 Non-retryable error for message ${message.requestId}: ${error.message}`);
            }

            return false;
        }
    }

    /**
     * Check if an error is retryable
     * @param {Error} error - Error to check
     * @returns {boolean} True if error is retryable
     */
    isRetryableError(error) {
        const retryableErrors = [
            'network error',
            'timeout',
            'connection refused',
            'insufficient funds',
            'nonce too low',
            'replacement transaction underpriced',
            'already known',
            'gas price too low'
        ];

        const errorMessage = error.message.toLowerCase();
        return retryableErrors.some(retryableError =>
            errorMessage.includes(retryableError)
        );
    }

    /**
     * Manually relay a specific message (for debugging/admin)
     * @param {string} requestId - Request ID to relay
     * @param {Object} messageData - Message data
     * @returns {Promise<boolean>} True if successful
     */
    async manualRelay(requestId, messageData) {
        logger.info(`🔧 Manual relay requested for message: ${requestId}`);

        const message = {
            requestId: messageData.requestId,
            requester: messageData.requester,
            target: messageData.target,
            amount: messageData.amount,
            token: messageData.token,
            originChain: messageData.originChain,
            targetChain: messageData.targetChain,
            message: messageData.message,
            timestamp: Math.floor(messageData.timestamp / 1000),
            expiryTime: Math.floor(messageData.expiryTime / 1000),
            messageHash: messageData.messageHash,
            retryCount: 0
        };

        return await this.relayMessage(message);
    }

    /**
     * Get relay statistics
     * @returns {Object} Relay statistics
     */
    getStats() {
        return {
            ...this.stats,
            uptime: Date.now() - this.stats.startTime,
            isRunning: this.isRunning,
            averageGasPerRelay: this.stats.messagesRelayed > 0 ?
                Math.round(this.stats.gasUsed / this.stats.messagesRelayed) : 0,
            successRate: this.stats.messagesRelayed + this.stats.failedRelays > 0 ?
                (this.stats.messagesRelayed / (this.stats.messagesRelayed + this.stats.failedRelays) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Estimate relay cost for a message
     * @param {Object} message - Message to estimate
     * @returns {Promise<Object>} Cost estimation
     */
    async estimateRelayCost(message) {
        try {
            const targetChainKey = getChainKeyById(message.targetChain);
            if (!targetChainKey) {
                throw new Error(`Unknown target chain ID: ${message.targetChain}`);
            }

            const targetConfig = getChainConfig(targetChainKey);
            const contractWithSigner = this.providerManager.getContractWithSigner(targetChainKey);

            if (!contractWithSigner) {
                throw new Error(`No contract with signer for ${targetChainKey}`);
            }

            // Estimate gas
            const gasEstimate = await contractWithSigner.receiveMessage.estimateGas(
                message.requestId,
                message.requester,
                message.target,
                message.amount,
                message.token,
                message.originChain,
                message.message,
                message.timestamp,
                message.expiryTime,
                message.messageHash
            );

            // Get current gas price
            const provider = this.providerManager.getProvider(targetChainKey);
            const feeData = await provider.getFeeData();

            const gasLimit = gasEstimate * BigInt(Math.floor(targetConfig.gasMultiplier * 100)) / BigInt(100);
            const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
            const estimatedCost = gasLimit * gasPrice;

            return {
                chainName: targetConfig.name,
                chainId: targetConfig.chainId,
                gasEstimate: gasEstimate.toString(),
                gasLimit: gasLimit.toString(),
                gasPrice: ethers.formatUnits(gasPrice, 'gwei') + ' gwei',
                estimatedCostWei: estimatedCost.toString(),
                estimatedCostEth: ethers.formatEther(estimatedCost),
                gasMultiplier: targetConfig.gasMultiplier
            };

        } catch (error) {
            logger.error(`❌ Failed to estimate relay cost:`, error);
            throw error;
        }
    }

    /**
     * Get pending relay queue status
     * @returns {Object} Queue status
     */
    getQueueStatus() {
        return this.messageQueue.getStats();
    }
}

module.exports = MessageRelay; 