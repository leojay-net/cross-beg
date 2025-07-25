/**
 * CrossBeg Relayer Main Class
 * Orchestrates all relayer components and provides unified interface with database persistence
 */

const ProviderManager = require('./blockchain/ProviderManager');
const EventListener = require('./events/EventListener');
const MessageIndexer = require('./events/MessageIndexer');
const MessageQueue = require('./relay/MessageQueue');
const MessageRelay = require('./relay/MessageRelay');
const DatabaseManager = require('./database/DatabaseManager');
const QueueManager = require('./database/QueueManager');
const MessageIndexerDB = require('./database/MessageIndexerDB');
const SessionManager = require('./database/SessionManager');
const { getChainKeyById, getAllChains } = require('./config/chains');
const { TIME_RANGES } = require('./config/constants');
const logger = require('./utils/logger');

class CrossBegRelayer {
  constructor() {
    // Database components
    this.databaseManager = new DatabaseManager();
    this.queueManager = null;
    this.messageIndexerDB = null;
    this.sessionManager = null;
    
    // Core components
    this.providerManager = new ProviderManager();
    this.messageQueue = null; // Will be initialized with database backing
    this.messageIndexer = null; // Will be initialized with database backing
    this.eventListener = null;
    this.messageRelay = null;
    
    this.isInitialized = false;
    this.isReady = false;
    this.startTime = Date.now();
  }

  /**
   * Initialize the relayer system with database persistence
   */
  async initialize() {
    try {
      logger.startup('Initializing CrossBeg Relayer with database persistence...');
      
      // Initialize database first
      await this.databaseManager.initialize();
      
      // Initialize database-backed components
      this.queueManager = new QueueManager(this.databaseManager);
      this.messageIndexerDB = new MessageIndexerDB(this.databaseManager);
      this.sessionManager = new SessionManager(this.databaseManager);
      
      // Initialize provider manager
      await this.providerManager.initialize();
      
      // Initialize core components with database backing
      this.messageQueue = new MessageQueue(this.queueManager);
      this.messageIndexer = new MessageIndexer(this.providerManager, this.messageIndexerDB);
      this.eventListener = new EventListener(this.providerManager, this.messageQueue, this.messageIndexer, this.sessionManager);
      this.messageRelay = new MessageRelay(this.providerManager, this.messageQueue);
      
      // Start message indexer
      await this.messageIndexer.start();
      
      // Start event listeners
      this.eventListener.startListening();
      
      // Start message relay processor
      this.messageRelay.start();
      
      // Start periodic cleanup
      this.startPeriodicCleanup();
      
      this.isInitialized = true;
      this.isReady = true;
      
      logger.startup('CrossBeg Relayer initialized successfully with database persistence', {
        chains: Object.keys(getAllChains()).length,
        uptime: Date.now() - this.startTime,
        database: this.databaseManager.getStats()
      });
      
    } catch (error) {
      logger.criticalError('Failed to initialize CrossBeg Relayer', error);
      throw error;
    }
  }

  /**
   * Start periodic cleanup tasks
   */
  startPeriodicCleanup() {
    // Database cleanup every 6 hours
    setInterval(async () => {
      try {
        await this.databaseManager.cleanup();
        
        // Clean up expired messages from queue
        if (this.queueManager) {
          this.queueManager.cleanupExpiredMessages();
        }
        
        // Clean up old sessions
        if (this.sessionManager) {
          this.sessionManager.cleanupOldSessions();
        }
        
      } catch (error) {
        logger.error('❌ Error during periodic cleanup:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    logger.info('🔄 Started periodic cleanup tasks');
  }

  /**
   * Shutdown the relayer system gracefully
   */
  async shutdown() {
    try {
      logger.shutdown('Shutting down CrossBeg Relayer...');
      
      // Stop message relay
      if (this.messageRelay) {
        this.messageRelay.stop();
      }
      
      // Stop event listeners
      if (this.eventListener) {
        this.eventListener.stopAllListeners();
      }
      
      // Close database connection
      if (this.databaseManager) {
        this.databaseManager.close();
      }
      
      this.isReady = false;
      this.isInitialized = false;
      
      logger.shutdown('CrossBeg Relayer shutdown complete');
      
    } catch (error) {
      logger.criticalError('Error during relayer shutdown', error);
      throw error;
    }
  }

  /**
   * Check if relayer is ready to serve requests
   * @returns {boolean} True if ready
   */
  isRelayerReady() {
    return this.isReady && this.isInitialized;
  }

  /**
   * Get comprehensive system statistics
   * @returns {Object} System statistics
   */
  getStats() {
    const indexerStats = this.messageIndexer.getStats();
    const queueStats = this.messageQueue.getStats();
    const relayStats = this.messageRelay.getStats();
    
    return {
      uptime: Date.now() - this.startTime,
      isReady: this.isReady,
      isInitialized: this.isInitialized,
      indexer: indexerStats,
      queue: queueStats,
      relay: relayStats,
      chains: this.getChainStats(),
      startTime: new Date(this.startTime).toISOString(),
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get chain status information
   * @returns {Object} Chain status
   */
  getChainStatus() {
    return this.providerManager.getChainStatus();
  }

  /**
   * Get chain statistics
   * @returns {Object} Chain statistics
   */
  getChainStats() {
    const chainStatus = this.providerManager.getChainStatus();
    const chains = getAllChains();
    const stats = {};
    
    for (const [chainKey, config] of Object.entries(chains)) {
      const status = chainStatus[chainKey];
      stats[chainKey] = {
        name: config.name,
        chainId: config.chainId,
        isReady: status.isReady,
        contractAddress: config.contractAddress,
        lastProcessedBlock: this.messageIndexer.lastProcessedBlocks[chainKey] || 0
      };
    }
    
    return stats;
  }

  /**
   * Get wallet balances
   * @returns {Promise<Object>} Wallet balances
   */
  async getWalletBalances() {
    return await this.providerManager.getWalletBalances();
  }

  /**
   * Get queue status
   * @returns {Object} Queue status
   */
  getQueueStatus() {
    return this.messageQueue.getStats();
  }

  /**
   * Get queue details for debugging
   * @param {number} limit - Maximum items to return
   * @returns {Object} Queue details
   */
  getQueueDetails(limit = 10) {
    return {
      messageQueue: this.messageQueue.peekQueue(limit),
      retryQueue: this.messageQueue.peekRetryQueue(limit),
      stats: this.messageQueue.getStats()
    };
  }

  /**
   * Get messages by user address
   * @param {string} userAddress - User's address
   * @param {Object} options - Query options
   * @returns {Object} Query results
   */
  getMessagesByUser(userAddress, options = {}) {
    return this.messageIndexer.getMessagesByUser(userAddress, options);
  }

  /**
   * Get pending requests for a user
   * @param {string} userAddress - User's address
   * @param {Object} options - Query options
   * @returns {Object} Pending requests
   */
  getPendingRequests(userAddress, options = {}) {
    const result = this.messageIndexer.getMessagesByUser(userAddress, { 
      ...options, 
      status: 'received' 
    });
    
    // Filter for truly pending requests (received but not fulfilled/cancelled and not expired)
    const now = Date.now();
    result.messages = result.messages.filter(message => {
      const summary = message.summary;
      return summary.status === 'received' && 
             (!summary.expiryTime || summary.expiryTime > now);
    });
    
    return result;
  }

  /**
   * Get request history by ID
   * @param {string} requestId - Request ID
   * @returns {Object|null} Request history
   */
  getRequestHistory(requestId) {
    return this.messageIndexer.getRequestHistory(requestId);
  }

  /**
   * Search messages with filters
   * @param {Object} filters - Search filters
   * @returns {Object} Search results
   */
  searchMessages(filters) {
    const { 
      requester, 
      target, 
      token, 
      minAmount, 
      maxAmount, 
      status, 
      chainKey,
      fromDate,
      toDate,
      limit = 50,
      offset = 0
    } = filters;

    let filteredMessages = [];
    
    for (const [requestId, requestData] of this.messageIndexer.indexedMessages) {
      const summary = requestData.summary || this.messageIndexer.generateRequestSummary(requestData);
      let matches = true;

      // Apply filters
      if (requester && summary.requester?.toLowerCase() !== requester.toLowerCase()) {
        matches = false;
      }
      if (target && summary.target?.toLowerCase() !== target.toLowerCase()) {
        matches = false;
      }
      if (token && summary.token?.toLowerCase() !== token.toLowerCase()) {
        matches = false;
      }
      if (status && summary.status !== status) {
        matches = false;
      }
      if (chainKey && !requestData.events.some(e => e.chainKey === chainKey)) {
        matches = false;
      }
      if (minAmount && parseFloat(summary.amount) < minAmount) {
        matches = false;
      }
      if (maxAmount && parseFloat(summary.amount) > maxAmount) {
        matches = false;
      }
      if (fromDate && summary.createdAt < fromDate) {
        matches = false;
      }
      if (toDate && summary.createdAt > toDate) {
        matches = false;
      }

      if (matches) {
        filteredMessages.push({
          requestId,
          summary,
          events: requestData.events,
          lastUpdate: requestData.lastUpdate
        });
      }
    }

    const sortedMessages = filteredMessages
      .sort((a, b) => b.lastUpdate - a.lastUpdate)
      .slice(offset, offset + limit);

    return {
      messages: sortedMessages,
      total: filteredMessages.length,
      hasMore: offset + limit < filteredMessages.length,
      filters
    };
  }

  /**
   * Get analytics data
   * @param {string} timeRange - Time range for analytics
   * @returns {Object} Analytics data
   */
  getAnalytics(timeRange = TIME_RANGES.DAY) {
    const now = Date.now();
    let startTime;

    switch (timeRange) {
      case TIME_RANGES.HOUR:
        startTime = now - (60 * 60 * 1000);
        break;
      case TIME_RANGES.DAY:
        startTime = now - (24 * 60 * 60 * 1000);
        break;
      case TIME_RANGES.WEEK:
        startTime = now - (7 * 24 * 60 * 60 * 1000);
        break;
      case TIME_RANGES.MONTH:
        startTime = now - (30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = now - (24 * 60 * 60 * 1000);
    }

    const analytics = {
      timeRange,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(now).toISOString(),
      totalRequests: 0,
      requestsByStatus: {},
      requestsByChain: {},
      requestsByToken: {},
      volumeByToken: {},
      avgProcessingTime: 0
    };

    // Analyze indexed messages
    for (const [requestId, requestData] of this.messageIndexer.indexedMessages) {
      const summary = requestData.summary || this.messageIndexer.generateRequestSummary(requestData);
      
      if (summary.createdAt && summary.createdAt >= startTime) {
        analytics.totalRequests++;
        
        // Count by status
        analytics.requestsByStatus[summary.status] = 
          (analytics.requestsByStatus[summary.status] || 0) + 1;
        
        // Count by origin chain
        if (summary.originChain) {
          analytics.requestsByChain[summary.originChain] = 
            (analytics.requestsByChain[summary.originChain] || 0) + 1;
        }
        
        // Count by token
        if (summary.token) {
          analytics.requestsByToken[summary.token] = 
            (analytics.requestsByToken[summary.token] || 0) + 1;
          
          // Volume by token
          const amount = parseFloat(summary.amount) || 0;
          analytics.volumeByToken[summary.token] = 
            (analytics.volumeByToken[summary.token] || 0) + amount;
        }
      }
    }

    return analytics;
  }

  /**
   * Get message statistics
   * @returns {Object} Message statistics
   */
  getMessageStats() {
    const indexerStats = this.messageIndexer.getStats();
    const queueStats = this.messageQueue.getStats();
    const relayStats = this.messageRelay.getStats();

    return {
      totalMessages: indexerStats.totalIndexedRequests,
      messagesQueued: queueStats.messagesQueued,
      messagesProcessed: queueStats.messagesProcessed,
      messagesRelayed: relayStats.messagesRelayed,
      failedRelays: relayStats.failedRelays,
      successRate: relayStats.successRate,
      currentQueueSize: queueStats.currentQueueSize,
      currentRetryQueueSize: queueStats.currentRetryQueueSize
    };
  }

  /**
   * Manually relay a message
   * @param {string} requestId - Request ID
   * @returns {Promise<boolean>} Success status
   */
  async manualRelay(requestId) {
    const requestData = this.messageIndexer.indexedMessages.get(requestId);
    
    if (!requestData) {
      throw new Error('Request not found');
    }

    const sentEvent = requestData.events.find(e => e.type === 'sent');
    if (!sentEvent) {
      throw new Error('No sent event found for this request');
    }

    const messageData = {
      requestId: sentEvent.requestId,
      requester: sentEvent.requester,
      target: sentEvent.target,
      amount: sentEvent.amount,
      token: sentEvent.token,
      originChain: getAllChains()[sentEvent.chainKey].chainId,
      targetChain: sentEvent.targetChain,
      message: sentEvent.message,
      timestamp: Math.floor(sentEvent.timestamp / 1000),
      expiryTime: Math.floor(sentEvent.expiryTime / 1000),
      messageHash: sentEvent.messageHash
    };

    return await this.messageRelay.manualRelay(requestId, messageData);
  }

  /**
   * Refresh connection for a specific chain
   * @param {string} chainKey - Chain identifier
   */
  async refreshChain(chainKey) {
    await this.providerManager.refreshChain(chainKey);
    this.eventListener.restartChainListeners(chainKey);
  }

  /**
   * Get network information for a chain
   * @param {string} chainKey - Chain identifier
   * @returns {Promise<Object>} Network information
   */
  async getNetworkInfo(chainKey) {
    return await this.providerManager.getNetworkInfo(chainKey);
  }

  /**
   * Estimate relay cost for a message
   * @param {Object} messageData - Message data
   * @returns {Promise<Object>} Cost estimation
   */
  async estimateRelayCost(messageData) {
    return await this.messageRelay.estimateRelayCost(messageData);
  }

  /**
   * Clear all message queues (for debugging)
   */
  clearQueues() {
    this.messageQueue.clear();
    logger.warning('All message queues cleared');
  }

  /**
   * Restart event listeners for a chain
   * @param {string} chainKey - Chain identifier
   */
  restartChainListeners(chainKey) {
    this.eventListener.restartChainListeners(chainKey);
  }

  /**
   * Get event listeners status
   * @returns {Object} Listeners status
   */
  getListenersStatus() {
    return this.eventListener.getListenersStatus();
  }
}

module.exports = CrossBegRelayer; 