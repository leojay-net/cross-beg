/**
 * Message Indexer Module
 * Handles indexing and organization of blockchain events and messages
 */

const { getAllChains, getChainConfig } = require('../config/chains');
const { DEFAULT_CONFIG, EVENT_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

class MessageIndexer {
    constructor(providerManager, messageIndexerDB = null) {
        this.providerManager = providerManager;
        this.messageIndexerDB = messageIndexerDB;

        // Legacy in-memory storage (for backwards compatibility)
        this.indexedMessages = new Map();
        this.userMessageCache = new Map();
        this.lastProcessedBlocks = {};

        this.stats = {
            messagesIndexed: 0,
            eventsProcessed: 0,
            startTime: Date.now()
        };
    }

    /**
     * Load last processed blocks from database
     */
    async loadLastProcessedBlocks() {
        if (!this.messageIndexerDB) return;

        try {
            const chains = getAllChains();
            for (const chainKey of Object.keys(chains)) {
                const saved = this.messageIndexerDB.getSystemState(`lastProcessedBlock_${chainKey}`);
                if (saved) {
                    this.lastProcessedBlocks[chainKey] = saved;
                }
            }
            logger.info('✅ Loaded last processed blocks from database', this.lastProcessedBlocks);
        } catch (error) {
            logger.error('❌ Failed to load last processed blocks:', error);
        }
    }

    /**
     * Save last processed block for a chain
     */
    async saveLastProcessedBlock(chainKey, blockNumber) {
        if (!this.messageIndexerDB) return;

        try {
            this.lastProcessedBlocks[chainKey] = blockNumber;
            this.messageIndexerDB.setSystemState(`lastProcessedBlock_${chainKey}`, blockNumber);
        } catch (error) {
            logger.error(`❌ Failed to save last processed block for ${chainKey}:`, error);
        }
    }

    /**
     * Start the indexing process
     */
    async start() {
        logger.info('🔍 Starting message indexer...');

        // Load last processed blocks from database
        await this.loadLastProcessedBlocks();

        await this.indexHistoricalEvents();
        this.startPeriodicIndexing();

        // Clear user cache periodically to prevent memory leaks
        this.startCacheCleanup();

        logger.info('✅ Message indexer started successfully');
    }

    /**
     * Start periodic cache cleanup
     */
    startCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            const cacheTimeout = 5 * 60 * 1000; // 5 minutes

            for (const [userAddress, cacheEntry] of this.userMessageCache) {
                if (now - cacheEntry.lastAccess > cacheTimeout) {
                    this.userMessageCache.delete(userAddress);
                }
            }

            logger.debug('🧹 Cleaned user message cache', {
                remainingEntries: this.userMessageCache.size
            });
        }, 60000); // Run every minute
    }

    /**
     * Index a single message/event with database persistence
     * @param {Object} messageData - Message data to index
     */
    indexMessage(messageData) {
        // Use database indexer if available
        if (this.messageIndexerDB) {
            this.messageIndexerDB.indexMessage(messageData);
            this.stats.eventsProcessed++;
            return;
        }

        // Fallback to in-memory indexing (legacy)
        const requestId = messageData.requestId;

        if (!this.indexedMessages.has(requestId)) {
            this.indexedMessages.set(requestId, {
                requestId,
                events: [],
                lastUpdate: Date.now(),
                status: 'pending',
                crossChainData: {
                    originChain: null,
                    targetChain: null,
                    messageHash: null,
                    deliveryStatus: 'unknown'
                }
            });
        }

        const requestData = this.indexedMessages.get(requestId);
        requestData.events.push({
            ...messageData,
            indexedAt: Date.now()
        });
        requestData.lastUpdate = Date.now();

        // Update status based on latest event
        this.updateRequestStatus(requestData, messageData);

        // Update cross-chain data
        this.updateCrossChainData(requestData, messageData);

        // Clear relevant user caches when new events are indexed
        this.invalidateUserCaches(messageData);

        this.stats.messagesIndexed = this.indexedMessages.size;
        this.stats.eventsProcessed++;

        logger.debug(`📊 Indexed ${messageData.type} event`, {
            requestId,
            type: messageData.type,
            chainKey: messageData.chainKey,
            persistent: !!this.messageIndexerDB
        });
    }

    /**
     * Update request status based on event type
     * @param {Object} requestData - Request data
     * @param {Object} messageData - New message data
     */
    updateRequestStatus(requestData, messageData) {
        switch (messageData.type) {
            case EVENT_TYPES.FULFILLED:
                requestData.status = 'fulfilled';
                break;
            case EVENT_TYPES.CANCELLED:
                requestData.status = 'cancelled';
                break;
            case EVENT_TYPES.RECEIVED:
                if (requestData.status === 'pending') {
                    requestData.status = 'received';
                }
                break;
            case EVENT_TYPES.DELIVERED:
                if (requestData.status === 'pending') {
                    requestData.status = 'delivered';
                }
                break;
        }
    }

    /**
     * Update cross-chain data for a request
     * @param {Object} requestData - Request data
     * @param {Object} messageData - Message data
     */
    updateCrossChainData(requestData, messageData) {
        const crossChainData = requestData.crossChainData;

        switch (messageData.type) {
            case EVENT_TYPES.SENT:
                crossChainData.originChain = messageData.chainKey;
                crossChainData.targetChain = messageData.targetChain;
                crossChainData.messageHash = messageData.messageHash;
                crossChainData.deliveryStatus = 'sent';
                break;

            case EVENT_TYPES.RECEIVED:
                crossChainData.targetChain = messageData.chainKey;
                crossChainData.originChain = messageData.originChain;
                crossChainData.deliveryStatus = 'delivered';
                break;

            case EVENT_TYPES.DELIVERED:
                crossChainData.deliveryStatus = 'confirmed';
                break;

            case EVENT_TYPES.FULFILLED:
                crossChainData.deliveryStatus = 'fulfilled';
                break;

            case EVENT_TYPES.CANCELLED:
                crossChainData.deliveryStatus = 'cancelled';
                break;
        }
    }

    /**
     * Invalidate user caches when relevant events are indexed
     * @param {Object} messageData - Message data
     */
    invalidateUserCaches(messageData) {
        const usersToInvalidate = [];

        if (messageData.requester) {
            usersToInvalidate.push(messageData.requester.toLowerCase());
        }
        if (messageData.target) {
            usersToInvalidate.push(messageData.target.toLowerCase());
        }
        if (messageData.payer) {
            usersToInvalidate.push(messageData.payer.toLowerCase());
        }

        for (const userAddress of usersToInvalidate) {
            this.userMessageCache.delete(userAddress);
        }
    }

    /**
     * Index historical events from all chains
     */
    async indexHistoricalEvents() {
        const defaultBatchSize = parseInt(process.env.INDEXER_BATCH_SIZE) || DEFAULT_CONFIG.INDEXER_BATCH_SIZE;
        const maxBlocks = parseInt(process.env.HISTORICAL_BLOCKS_LIMIT) || DEFAULT_CONFIG.HISTORICAL_BLOCKS_LIMIT;

        const contracts = this.providerManager.getAllContracts();
        const providers = this.providerManager.getAllProviders();

        for (const [chainKey, contract] of Object.entries(contracts)) {
            try {
                const provider = providers[chainKey];
                const latestBlock = await provider.getBlockNumber();

                // Determine starting block - use saved last processed block or go back maxBlocks
                let fromBlock;
                if (this.lastProcessedBlocks[chainKey]) {
                    // Resume from where we left off
                    fromBlock = this.lastProcessedBlocks[chainKey] + 1;
                    if (fromBlock > latestBlock) {
                        logger.info(`✅ ${getChainConfig(chainKey).name} already up to date (block ${this.lastProcessedBlocks[chainKey]})`);
                        continue;
                    }
                } else {
                    // First time indexing - go back maxBlocks
                    fromBlock = Math.max(0, latestBlock - maxBlocks);
                }

                const config = getChainConfig(chainKey);
                // Use chain-specific batch size if available, otherwise use default
                const batchSize = Math.min(config.maxLogBlockRange || defaultBatchSize, defaultBatchSize);

                logger.info(`🔍 Indexing ${config.name} from block ${fromBlock} to ${latestBlock} (batch size: ${batchSize})`);

                // Index in batches
                for (let start = fromBlock; start <= latestBlock; start += batchSize) {
                    const end = Math.min(start + batchSize - 1, latestBlock);

                    await this.indexBlockRange(chainKey, contract, start, end);

                    // Small delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                this.lastProcessedBlocks[chainKey] = latestBlock;
                await this.saveLastProcessedBlock(chainKey, latestBlock);
                logger.info(`✅ Completed historical indexing for ${config.name}`);

            } catch (error) {
                logger.error(`❌ Error indexing historical events for ${chainKey}:`, error);
            }
        }
    }

    /**
     * Index events within a specific block range
     * @param {string} chainKey - Chain identifier
     * @param {ethers.Contract} contract - Contract instance
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block
     */
    async indexBlockRange(chainKey, contract, fromBlock, toBlock) {
        try {
            // Index CrossChainMessageSent events
            await this.indexEventType(chainKey, contract, 'CrossChainMessageSent', fromBlock, toBlock, EVENT_TYPES.SENT);

            // Index PaymentRequestReceived events
            await this.indexEventType(chainKey, contract, 'PaymentRequestReceived', fromBlock, toBlock, EVENT_TYPES.RECEIVED);

            // Index PaymentRequestFulfilled events
            await this.indexEventType(chainKey, contract, 'PaymentRequestFulfilled', fromBlock, toBlock, EVENT_TYPES.FULFILLED);

            // Index PaymentRequestCancelled events
            await this.indexEventType(chainKey, contract, 'PaymentRequestCancelled', fromBlock, toBlock, EVENT_TYPES.CANCELLED);

            // Index MessageStatusUpdated events
            await this.indexEventType(chainKey, contract, 'MessageStatusUpdated', fromBlock, toBlock, EVENT_TYPES.STATUS_UPDATED);

            // Index CrossChainMessageDelivered events
            await this.indexEventType(chainKey, contract, 'CrossChainMessageDelivered', fromBlock, toBlock, EVENT_TYPES.DELIVERED);

        } catch (error) {
            logger.error(`❌ Error indexing block range ${fromBlock}-${toBlock} for ${chainKey}:`, error);
        }
    }

    /**
     * Index specific event type within block range
     * @param {string} chainKey - Chain identifier
     * @param {ethers.Contract} contract - Contract instance
     * @param {string} eventName - Event name to index
     * @param {number} fromBlock - Starting block
     * @param {number} toBlock - Ending block
     * @param {string} eventType - Event type for indexing
     */
    async indexEventType(chainKey, contract, eventName, fromBlock, toBlock, eventType) {
        try {
            const config = getChainConfig(chainKey);
            let events = [];

            if (config.disableEventFilters) {
                // For chains that don't support event filters, use direct eth_getLogs
                const eventTopic = contract.interface.getEvent(eventName).topicHash;
                // Get provider from providerManager instead of contract.provider (which can be undefined for chains with polling disabled)
                const provider = this.providerManager.getProvider(chainKey);

                const logs = await provider.getLogs({
                    address: contract.target,
                    topics: [eventTopic],
                    fromBlock: fromBlock,
                    toBlock: toBlock
                });

                // Parse the logs manually
                events = logs.map(log => {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        return {
                            ...parsed,
                            blockNumber: log.blockNumber,
                            blockHash: log.blockHash,
                            transactionHash: log.transactionHash,
                            transactionIndex: log.transactionIndex,
                            logIndex: log.logIndex,
                            address: log.address
                        };
                    } catch (error) {
                        logger.warn(`Failed to parse log for ${eventName} on ${chainKey}:`, error);
                        return null;
                    }
                }).filter(Boolean);
            } else {
                // Use standard queryFilter for chains that support event filters
                const filter = contract.filters[eventName]();
                events = await contract.queryFilter(filter, fromBlock, toBlock);
            }

            for (const event of events) {
                const messageData = this.parseEventData(event, eventType, chainKey);
                if (messageData) {
                    this.indexMessage(messageData);
                }
            }

            if (events.length > 0) {
                logger.debug(`📊 Indexed ${events.length} ${eventName} events for ${chainKey} (blocks ${fromBlock}-${toBlock})`);
            }

        } catch (error) {
            logger.error(`❌ Error indexing ${eventName} events for ${chainKey} (blocks ${fromBlock}-${toBlock}):`, error);
        }
    }


    /**
     * Parse event data based on event type
     * @param {Object} event - Blockchain event
     * @param {string} eventType - Type of event
     * @param {string} chainKey - Chain identifier
     * @returns {Object|null} Parsed message data
     */
    parseEventData(event, eventType, chainKey) {
        try {
            const config = getChainConfig(chainKey);
            const args = event.args;

            const baseData = {
                type: eventType,
                chainKey,
                blockNumber: event.blockNumber,
                txHash: event.transactionHash,
                timestamp: Date.now()
            };

            switch (eventType) {
                case EVENT_TYPES.SENT:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        requester: args.requester,
                        target: args.target,
                        targetChain: Number(args.targetChain),
                        amount: args.amount.toString(),
                        token: args.token,
                        message: args.message,
                        expiryTime: Number(args.expiryTime) * 1000,
                        messageHash: args.messageHash
                    };

                case EVENT_TYPES.RECEIVED:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        requester: args.requester,
                        target: args.target,
                        amount: args.amount.toString(),
                        token: args.token,
                        originChain: Number(args.originChain),
                        targetChain: config.chainId,
                        message: args.message,
                        timestamp: Number(args.timestamp) * 1000,
                        expiryTime: Number(args.expiryTime) * 1000,
                        status: Number(args.status)
                    };

                case EVENT_TYPES.FULFILLED:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        payer: args.payer,
                        amount: args.amount.toString(),
                        token: args.token,
                        fulfillmentTxHash: args.txHash
                    };

                case EVENT_TYPES.CANCELLED:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        requester: args.requester
                    };

                case EVENT_TYPES.STATUS_UPDATED:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        oldStatus: Number(args.oldStatus),
                        newStatus: Number(args.newStatus)
                    };

                case EVENT_TYPES.DELIVERED:
                    return {
                        ...baseData,
                        requestId: args.requestId.toString(),
                        originChain: Number(args.originChain),
                        messageHash: args.messageHash,
                        status: Number(args.status)
                    };

                default:
                    logger.warn(`Unknown event type: ${eventType}`);
                    return null;
            }
        } catch (error) {
            logger.error(`❌ Error parsing event data:`, error);
            return null;
        }
    }

    /**
     * Start periodic indexing of recent events
     */
    startPeriodicIndexing() {
        const indexerInterval = parseInt(process.env.INDEXER_INTERVAL) || DEFAULT_CONFIG.INDEXER_INTERVAL;

        setInterval(async () => {
            await this.indexRecentEvents();
        }, indexerInterval);

        logger.info(`🔄 Periodic indexing started (interval: ${indexerInterval}ms)`);
    }

    /**
     * Index recent events from all chains
     */
    async indexRecentEvents() {
        const defaultBatchSize = parseInt(process.env.INDEXER_BATCH_SIZE) || DEFAULT_CONFIG.INDEXER_BATCH_SIZE;
        const contracts = this.providerManager.getAllContracts();
        const providers = this.providerManager.getAllProviders();

        for (const [chainKey, contract] of Object.entries(contracts)) {
            try {
                const provider = providers[chainKey];
                const latestBlock = await provider.getBlockNumber();
                const fromBlock = (this.lastProcessedBlocks[chainKey] || latestBlock - 100) + 1;

                if (fromBlock > latestBlock) continue;

                const config = getChainConfig(chainKey);
                // Use chain-specific batch size if available, otherwise use default
                const batchSize = Math.min(config.maxLogBlockRange || defaultBatchSize, defaultBatchSize);

                // Index in batches if the range is large
                const totalBlocks = latestBlock - fromBlock + 1;
                if (totalBlocks > batchSize) {
                    for (let start = fromBlock; start <= latestBlock; start += batchSize) {
                        const end = Math.min(start + batchSize - 1, latestBlock);
                        await this.indexBlockRange(chainKey, contract, start, end);
                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                } else {
                    await this.indexBlockRange(chainKey, contract, fromBlock, latestBlock);
                }

                this.lastProcessedBlocks[chainKey] = latestBlock;
                await this.saveLastProcessedBlock(chainKey, latestBlock);

            } catch (error) {
                logger.error(`❌ Error indexing recent events for ${chainKey}:`, error);
            }
        }
    }

    /**
     * Get messages by user address (cross-chain aggregated) with database persistence
     * @param {string} userAddress - User's address
     * @param {Object} options - Query options
     * @returns {Object} Query results
     */
    getMessagesByUser(userAddress, options = {}) {
        // Use database indexer if available
        if (this.messageIndexerDB) {
            return this.messageIndexerDB.getMessagesByUser(userAddress, options);
        }

        // Fallback to in-memory indexing (legacy)
        const { limit = 50, offset = 0, status, chainKey, includeAllChains = true } = options;
        const userAddressLower = userAddress.toLowerCase();

        const userMessages = [];

        for (const [requestId, requestData] of this.indexedMessages) {
            const events = requestData.events;

            // Check if user is involved in this request
            const isUserInvolved = events.some(event => {
                return event.requester?.toLowerCase() === userAddressLower ||
                    event.target?.toLowerCase() === userAddressLower ||
                    event.payer?.toLowerCase() === userAddressLower;
            });

            if (!isUserInvolved) continue;

            // Apply filters
            const statusMatch = !status || requestData.status === status;
            const chainMatch = !chainKey || events.some(e => e.chainKey === chainKey);

            if (statusMatch && chainMatch) {
                const summary = this.generateRequestSummary(requestData);

                userMessages.push({
                    requestId,
                    status: requestData.status,
                    events: events,
                    lastUpdate: requestData.lastUpdate,
                    summary: {
                        ...summary,
                        // Enhanced cross-chain context
                        crossChainContext: {
                            originChainKey: requestData.crossChainData.originChain,
                            targetChainKey: requestData.crossChainData.targetChain,
                            deliveryStatus: requestData.crossChainData.deliveryStatus,
                            messageHash: requestData.crossChainData.messageHash,
                            isCrossChain: requestData.crossChainData.originChain !== requestData.crossChainData.targetChain,
                            allInvolvedChains: [...new Set(events.map(e => e.chainKey))],
                            userRole: this.getUserRoleInRequest(userAddressLower, events)
                        }
                    }
                });
            }
        }

        const sortedMessages = userMessages
            .sort((a, b) => b.lastUpdate - a.lastUpdate)
            .slice(offset, offset + limit);

        return {
            messages: sortedMessages,
            total: userMessages.length,
            hasMore: offset + limit < userMessages.length,
            crossChainSummary: this.generateCrossChainSummary(userMessages, userAddressLower)
        };
    }

    /**
     * Determine user's role in a request
     * @param {string} userAddress - User address (lowercase)
     * @param {Array} events - Request events
     * @returns {string} User role
     */
    getUserRoleInRequest(userAddress, events) {
        const roles = [];

        if (events.some(e => e.requester?.toLowerCase() === userAddress)) {
            roles.push('requester');
        }
        if (events.some(e => e.target?.toLowerCase() === userAddress)) {
            roles.push('target');
        }
        if (events.some(e => e.payer?.toLowerCase() === userAddress)) {
            roles.push('payer');
        }

        return roles.join(', ') || 'unknown';
    }

    /**
     * Generate cross-chain summary for user messages
     * @param {Array} userMessages - User's messages
     * @param {string} userAddress - User address (lowercase)
     * @returns {Object} Cross-chain summary
     */
    generateCrossChainSummary(userMessages, userAddress) {
        const summary = {
            totalRequests: userMessages.length,
            crossChainRequests: 0,
            localRequests: 0,
            chainDistribution: {},
            statusDistribution: {},
            roleDistribution: { requester: 0, target: 0, payer: 0 }
        };

        for (const message of userMessages) {
            const crossChainContext = message.summary.crossChainContext;

            // Count cross-chain vs local
            if (crossChainContext.isCrossChain) {
                summary.crossChainRequests++;
            } else {
                summary.localRequests++;
            }

            // Chain distribution
            for (const chainKey of crossChainContext.allInvolvedChains) {
                const chainName = getChainConfig(chainKey)?.name || chainKey;
                summary.chainDistribution[chainName] = (summary.chainDistribution[chainName] || 0) + 1;
            }

            // Status distribution
            summary.statusDistribution[message.status] = (summary.statusDistribution[message.status] || 0) + 1;

            // Role distribution
            const roles = crossChainContext.userRole.split(', ');
            for (const role of roles) {
                if (summary.roleDistribution[role] !== undefined) {
                    summary.roleDistribution[role]++;
                }
            }
        }

        return summary;
    }

    /**
     * Generate request summary from events
     * @param {Object} requestData - Request data
     * @returns {Object} Request summary
     */
    generateRequestSummary(requestData) {
        const events = requestData.events;
        const sentEvent = events.find(e => e.type === EVENT_TYPES.SENT);
        const receivedEvent = events.find(e => e.type === EVENT_TYPES.RECEIVED);
        const fulfilledEvent = events.find(e => e.type === EVENT_TYPES.FULFILLED);
        const cancelledEvent = events.find(e => e.type === EVENT_TYPES.CANCELLED);
        const deliveredEvent = events.find(e => e.type === EVENT_TYPES.DELIVERED);

        // Determine origin and target chains more accurately
        let originChainName = null;
        let targetChainName = null;

        if (sentEvent) {
            originChainName = getChainConfig(sentEvent.chainKey)?.name;
            // For sent events, target chain comes from the event data
            const targetChainKey = Object.keys(getAllChains()).find(key =>
                getAllChains()[key].chainId === sentEvent.targetChain
            );
            targetChainName = targetChainKey ? getChainConfig(targetChainKey)?.name : `Chain ${sentEvent.targetChain}`;
        } else if (receivedEvent) {
            targetChainName = getChainConfig(receivedEvent.chainKey)?.name;
            // For received events, origin chain comes from the event data
            const originChainKey = Object.keys(getAllChains()).find(key =>
                getAllChains()[key].chainId === receivedEvent.originChain
            );
            originChainName = originChainKey ? getChainConfig(originChainKey)?.name : `Chain ${receivedEvent.originChain}`;
        }

        return {
            requester: sentEvent?.requester || receivedEvent?.requester,
            target: sentEvent?.target || receivedEvent?.target,
            amount: sentEvent?.amount || receivedEvent?.amount,
            token: sentEvent?.token || receivedEvent?.token,
            message: sentEvent?.message || receivedEvent?.message,
            originChain: originChainName,
            targetChain: targetChainName,
            status: requestData.status,
            createdAt: sentEvent?.timestamp || receivedEvent?.timestamp,
            fulfilledAt: fulfilledEvent?.timestamp,
            cancelledAt: cancelledEvent?.timestamp,
            deliveredAt: deliveredEvent?.timestamp,
            expiryTime: sentEvent?.expiryTime || receivedEvent?.expiryTime,
            // Enhanced tracking
            eventCount: events.length,
            lastEventType: events[events.length - 1]?.type,
            allChains: [...new Set(events.map(e => getChainConfig(e.chainKey)?.name).filter(Boolean))],
            txHashes: [...new Set(events.map(e => e.txHash).filter(Boolean))]
        };
    }

    /**
     * Get request history by ID
     * @param {string} requestId - Request ID
     * @returns {Object|null} Request history
     */
    getRequestHistory(requestId) {
        const requestData = this.indexedMessages.get(requestId);
        if (!requestData) return null;

        return {
            ...requestData,
            summary: this.generateRequestSummary(requestData),
            timeline: requestData.events
                .sort((a, b) => a.indexedAt - b.indexedAt)
                .map(event => ({
                    type: event.type,
                    timestamp: event.timestamp || event.indexedAt,
                    chainName: getChainConfig(event.chainKey)?.name,
                    txHash: event.txHash,
                    blockNumber: event.blockNumber,
                    details: this.formatEventDetails(event)
                }))
        };
    }

    /**
     * Format event details for display
     * @param {Object} event - Event data
     * @returns {Object} Formatted details
     */
    formatEventDetails(event) {
        switch (event.type) {
            case EVENT_TYPES.SENT:
                return {
                    from: event.requester,
                    to: event.target,
                    amount: event.amount,
                    token: event.token,
                    targetChain: event.targetChain
                };
            case EVENT_TYPES.RECEIVED:
                return {
                    from: event.requester,
                    to: event.target,
                    amount: event.amount,
                    token: event.token,
                    originChain: event.originChain
                };
            case EVENT_TYPES.FULFILLED:
                return {
                    payer: event.payer,
                    amount: event.amount,
                    token: event.token,
                    fulfillmentTxHash: event.fulfillmentTxHash
                };
            case EVENT_TYPES.CANCELLED:
                return {
                    cancelledBy: event.requester
                };
            default:
                return {};
        }
    }

    /**
     * Get indexer statistics
     * @returns {Object} Indexer stats
     */
    getStats() {
        return {
            ...this.stats,
            totalIndexedRequests: this.indexedMessages.size,
            uptime: Date.now() - this.stats.startTime,
            lastProcessedBlocks: { ...this.lastProcessedBlocks }
        };
    }

    /**
     * Clear all indexed data (for testing/debugging)
     */
    clear() {
        this.indexedMessages.clear();
        this.lastProcessedBlocks = {};
        this.stats.messagesIndexed = 0;
        this.stats.eventsProcessed = 0;
        this.userMessageCache.clear(); // Clear cache on clear

        logger.info('🗑️ Cleared all indexed data');
    }
}

module.exports = MessageIndexer;