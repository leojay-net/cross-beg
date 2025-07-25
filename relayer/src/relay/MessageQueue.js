/**
 * Message Queue Module
 * Manages queuing and processing of cross-chain messages with database persistence
 */

const { DEFAULT_CONFIG } = require('../config/constants');
const { getAllChains } = require('../config/chains');
const logger = require('../utils/logger');

class MessageQueue {
    constructor(queueManager = null) {
        // Database-backed queue manager
        this.queueManager = queueManager;
        
        // Legacy in-memory queues (for backwards compatibility during transition)
        this.messageQueue = [];
        this.retryQueue = [];
        this.priorityQueue = [];
        this.chainQueues = new Map();
        
        this.isProcessing = false;
        this.processingByChain = new Map();
        this.stats = {
            messagesQueued: 0,
            messagesProcessed: 0,
            messagesRetried: 0,
            processingErrors: 0,
            messagesByChain: {},
            priorityMessages: 0
        };
        
        // Initialize chain-specific tracking
        this.initializeChainQueues();
    }

    /**
     * Initialize separate queues for each supported chain
     */
    initializeChainQueues() {
        const chains = getAllChains();
        for (const [chainKey, config] of Object.entries(chains)) {
            this.chainQueues.set(config.chainId, {
                messages: [],
                processing: false,
                lastProcessed: 0,
                errorCount: 0
            });
            this.stats.messagesByChain[config.name] = 0;
            this.processingByChain.set(config.chainId, false);
        }

        logger.debug('🔧 Initialized chain-specific queues', {
            chainCount: this.chainQueues.size
        });
    }

        /**
     * Queue a message for relay processing with database persistence
     * @param {Object} message - Message to queue
     * @param {boolean} isPriority - Whether this is a priority message
     */
    async queueMessage(message, isPriority = false) {
        // Use database queue if available
        if (this.queueManager) {
            const success = await this.queueManager.queueMessage(message, isPriority);
            if (success) {
                this.stats.messagesQueued++;
                if (isPriority) {
                    this.stats.priorityMessages++;
                }
                
                // Update chain statistics
                const chainName = Object.values(getAllChains())
                    .find(chain => chain.chainId === message.targetChain)?.name || `Chain ${message.targetChain}`;
                this.stats.messagesByChain[chainName] = (this.stats.messagesByChain[chainName] || 0) + 1;
            }
            return success;
        }

        // Fallback to in-memory queue (legacy)
        if (Date.now() / 1000 > message.expiryTime) {
            logger.warn(`⏰ Message expired, not queuing: ${message.requestId}`);
            return false;
        }

        const enhancedMessage = {
            ...message,
            queuedAt: Date.now(),
            priority: isPriority,
            chainSpecific: true
        };

        if (isPriority) {
            this.priorityQueue.push(enhancedMessage);
            this.stats.priorityMessages++;
        } else {
            const chainQueue = this.chainQueues.get(message.targetChain);
            if (chainQueue) {
                chainQueue.messages.push(enhancedMessage);
                
                const chainName = Object.values(getAllChains())
                    .find(chain => chain.chainId === message.targetChain)?.name || `Chain ${message.targetChain}`;
                this.stats.messagesByChain[chainName] = (this.stats.messagesByChain[chainName] || 0) + 1;
            } else {
                this.messageQueue.push(enhancedMessage);
            }
        }

        this.stats.messagesQueued++;

        logger.info(`📥 Queued message for relay`, {
            requestId: message.requestId,
            targetChain: message.targetChain,
            isPriority,
            totalQueued: this.getTotalQueueSize(),
            persistent: !!this.queueManager
        });

        return true;
    }

    /**
     * Get the next message from the queue with database persistence
     * @param {number} preferredChainId - Preferred chain ID for processing
     * @returns {Object|null} Next message or null if queue is empty
     */
    getNextMessage(preferredChainId = null) {
        // Use database queue if available
        if (this.queueManager) {
            return this.queueManager.getNextMessage(preferredChainId);
        }

        // Fallback to in-memory queue (legacy)
        if (this.priorityQueue.length > 0) {
            return this.priorityQueue.shift();
        }

        if (preferredChainId && this.chainQueues.has(preferredChainId)) {
            const chainQueue = this.chainQueues.get(preferredChainId);
            if (chainQueue.messages.length > 0 && !chainQueue.processing) {
                chainQueue.processing = true;
                return chainQueue.messages.shift();
            }
        }

        for (const [chainId, chainQueue] of this.chainQueues) {
            if (chainQueue.messages.length > 0 && !chainQueue.processing) {
                chainQueue.processing = true;
                return chainQueue.messages.shift();
            }
        }

        return this.messageQueue.shift() || null;
    }

    /**
     * Mark chain processing as complete
     * @param {number} chainId - Chain ID
     * @param {boolean} success - Whether processing was successful
     */
    markChainProcessingComplete(chainId, success = true) {
        const chainQueue = this.chainQueues.get(chainId);
        if (chainQueue) {
            chainQueue.processing = false;
            chainQueue.lastProcessed = Date.now();

            if (!success) {
                chainQueue.errorCount++;
            } else {
                chainQueue.errorCount = Math.max(0, chainQueue.errorCount - 1); // Reduce error count on success
            }
        }
    }

    /**
     * Get total queue size across all queues
     * @returns {number} Total queue size
     */
    getTotalQueueSize() {
        let total = this.messageQueue.length + this.priorityQueue.length;

        for (const chainQueue of this.chainQueues.values()) {
            total += chainQueue.messages.length;
        }

        return total;
    }

    /**
     * Add message to retry queue
     * @param {Object} message - Message to retry
     */
    addToRetryQueue(message) {
        const maxRetries = parseInt(process.env.MAX_RETRY_ATTEMPTS) || DEFAULT_CONFIG.MAX_RETRY_ATTEMPTS;
        const retryDelay = parseInt(process.env.RETRY_DELAY) || DEFAULT_CONFIG.RETRY_DELAY;

        if ((message.retryCount || 0) < maxRetries) {
            message.retryCount = (message.retryCount || 0) + 1;
            message.nextRetry = Date.now() + (retryDelay * message.retryCount);

            this.retryQueue.push(message);
            this.stats.messagesRetried++;

            logger.info(`🔄 Added message to retry queue`, {
                requestId: message.requestId,
                retryCount: message.retryCount,
                nextRetry: new Date(message.nextRetry).toISOString()
            });

            return true;
        } else {
            logger.error(`💀 Max retries exceeded for message ${message.requestId}`);
            return false;
        }
    }

    /**
     * Process retry queue and move ready messages back to main queue
     */
    processRetryQueue() {
        const now = Date.now();
        const readyToRetry = this.retryQueue.filter(msg => msg.nextRetry <= now);

        if (readyToRetry.length > 0) {
            logger.info(`🔄 Processing ${readyToRetry.length} retry messages`);

            readyToRetry.forEach(message => {
                // Remove from retry queue
                const index = this.retryQueue.indexOf(message);
                if (index > -1) {
                    this.retryQueue.splice(index, 1);
                }

                // Add back to main queue (priority)
                this.messageQueue.unshift(message);
            });
        }
    }

    /**
     * Get comprehensive queue statistics
     * @returns {Object} Queue statistics
     */
    getStats() {
        const chainQueueStats = {};
        let totalChainMessages = 0;
        
        for (const [chainId, chainQueue] of this.chainQueues) {
            const chainName = Object.values(getAllChains())
                .find(chain => chain.chainId === chainId)?.name || `Chain ${chainId}`;
            
            chainQueueStats[chainName] = {
                messages: chainQueue.messages.length,
                processing: chainQueue.processing,
                lastProcessed: chainQueue.lastProcessed ? new Date(chainQueue.lastProcessed).toISOString() : null,
                errorCount: chainQueue.errorCount
            };
            
            totalChainMessages += chainQueue.messages.length;
        }

        return {
            ...this.stats,
            currentQueueSize: this.messageQueue.length,
            currentRetryQueueSize: this.retryQueue.length,
            priorityQueueSize: this.priorityQueue.length,
            totalQueueSize: this.getTotalQueueSize(),
            chainQueueStats,
            totalChainMessages,
            isProcessing: this.isProcessing,
            nextRetryMessages: this.retryQueue
                .filter(msg => msg.nextRetry <= Date.now() + 60000) // Next minute
                .map(msg => ({
                    requestId: msg.requestId,
                    retryCount: msg.retryCount,
                    nextRetry: new Date(msg.nextRetry).toISOString(),
                    targetChain: msg.targetChain
                })),
            processingByChain: Object.fromEntries(
                Array.from(this.processingByChain.entries()).map(([chainId, processing]) => {
                    const chainName = Object.values(getAllChains())
                        .find(chain => chain.chainId === chainId)?.name || `Chain ${chainId}`;
                    return [chainName, processing];
                })
            )
        };
    }

    /**
     * Mark processing as started
     */
    startProcessing() {
        this.isProcessing = true;
    }

    /**
     * Mark processing as completed
     */
    completeProcessing() {
        this.isProcessing = false;
        this.stats.messagesProcessed++;
    }

    /**
     * Mark processing error
     */
    recordProcessingError() {
        this.isProcessing = false;
        this.stats.processingErrors++;
    }

    /**
     * Get current queue size
     * @returns {number} Queue size
     */
    getQueueSize() {
        return this.messageQueue.length;
    }

    /**
     * Get current retry queue size
     * @returns {number} Retry queue size
     */
    getRetryQueueSize() {
        return this.retryQueue.length;
    }

    /**
     * Check if queue is empty
     * @returns {boolean} True if queue is empty
     */
    isEmpty() {
        return this.messageQueue.length === 0;
    }

    /**
     * Clear all queues (for testing/debugging)
     */
    clear() {
        this.messageQueue = [];
        this.retryQueue = [];
        this.isProcessing = false;

        logger.info('🗑️ Cleared all message queues');
    }

    /**
     * Get messages in queue (for debugging)
     * @param {number} limit - Maximum number of messages to return
     * @returns {Array} Messages in queue
     */
    peekQueue(limit = 10) {
        return this.messageQueue.slice(0, limit).map(msg => ({
            requestId: msg.requestId,
            requester: msg.requester,
            target: msg.target,
            targetChain: msg.targetChain,
            amount: msg.amount,
            token: msg.token,
            retryCount: msg.retryCount || 0,
            expiryTime: new Date(msg.expiryTime * 1000).toISOString()
        }));
    }

    /**
     * Get messages in retry queue (for debugging)
     * @param {number} limit - Maximum number of messages to return
     * @returns {Array} Messages in retry queue
     */
    peekRetryQueue(limit = 10) {
        return this.retryQueue.slice(0, limit).map(msg => ({
            requestId: msg.requestId,
            requester: msg.requester,
            target: msg.target,
            targetChain: msg.targetChain,
            amount: msg.amount,
            token: msg.token,
            retryCount: msg.retryCount,
            nextRetry: new Date(msg.nextRetry).toISOString(),
            expiryTime: new Date(msg.expiryTime * 1000).toISOString()
        }));
    }
}

module.exports = MessageQueue; 