/**
 * Event Listener Module
 * Handles blockchain event listening and processing
 */

const { getAllChains, getChainConfig } = require('../config/chains');
const { EVENT_TYPES } = require('../config/constants');
const logger = require('../utils/logger');

class EventListener {
  constructor(providerManager, messageQueue, messageIndexer, sessionManager = null) {
    this.providerManager = providerManager;
    this.messageQueue = messageQueue;
    this.messageIndexer = messageIndexer;
    this.sessionManager = sessionManager;
    this.activeListeners = new Map();
  }

  /**
   * Add WebSocket client for real-time updates
   * @param {WebSocket} ws - WebSocket connection
   */
  addWebSocketClient(ws) {
    this.wsClients.add(ws);

    ws.on('close', () => {
      this.wsClients.delete(ws);
    });

    logger.debug('📡 Added WebSocket client', {
      totalClients: this.wsClients.size
    });
  }

  /**
   * Broadcast targeted update to relevant users
   * @param {Object} update - Update data
   */
  broadcastUpdate(update) {
    if (!this.sessionManager) return;

    // Determine which users should receive this update
    const targetUsers = this.getTargetUsers(update);

    for (const userAddress of targetUsers) {
      const sessions = this.sessionManager.getNotificationSessions(userAddress);

      for (const session of sessions) {
        if (this.shouldReceiveUpdate(session, update)) {
          try {
            const updateData = JSON.stringify({
              type: 'cross_chain_update',
              timestamp: Date.now(),
              ...update
            });

            session.ws.send(updateData);

            logger.debug('📡 Sent targeted update', {
              sessionId: session.sessionId.substring(0, 8) + '...',
              userAddress,
              updateType: update.eventType
            });

          } catch (error) {
            logger.error('❌ Error sending targeted update:', error);
          }
        }
      }
    }
  }

  /**
   * Determine which users should receive an update
   * @param {Object} update - Update data
   * @returns {Array} Array of user addresses
   */
  getTargetUsers(update) {
    const users = new Set();

    // Add requester
    if (update.requester) {
      users.add(update.requester.toLowerCase());
    }

    // Add target
    if (update.target) {
      users.add(update.target.toLowerCase());
    }

    // Add payer (for fulfilled events)
    if (update.payer) {
      users.add(update.payer.toLowerCase());
    }

    return Array.from(users);
  }

  /**
   * Check if a session should receive an update
   * @param {Object} session - User session
   * @param {Object} update - Update data
   * @returns {boolean} Whether session should receive update
   */
  shouldReceiveUpdate(session, update) {
    // Check user subscriptions
    const hasUserSubscription = session.subscriptions.some(sub =>
      sub.type === 'user_updates' &&
      sub.data.userAddress?.toLowerCase() === session.userAddress
    );

    // Check chain subscriptions
    const hasChainSubscription = session.subscriptions.some(sub =>
      sub.type === 'chain_updates' &&
      (sub.data.chainId === update.originChain || sub.data.chainId === update.targetChain)
    );

    return hasUserSubscription || hasChainSubscription;
  }

  /**
   * Start listening to events on all chains
   */
  startListening() {
    const contracts = this.providerManager.getAllContracts();

    for (const [chainKey, contract] of Object.entries(contracts)) {
      this.setupChainListeners(chainKey, contract);
    }

    logger.info(`🎧 Started event listeners for ${Object.keys(contracts).length} chains`);
  }

  /**
   * Setup event listeners for a specific chain
   * @param {string} chainKey - Chain identifier
   * @param {ethers.Contract} contract - Contract instance
   */
  setupChainListeners(chainKey, contract) {
    const config = getChainConfig(chainKey);

    // Skip setting up event listeners for chains that don't support event filters
    if (config.disableEventFilters) {
      logger.info(`⏭️ Skipping event listeners for ${config.name} (event filters disabled)`);
      return;
    }

    const listeners = [];

    // CrossChainMessageSent - for message relaying
    const messageListener = this.createCrossChainMessageSentListener(chainKey, contract);
    contract.on('CrossChainMessageSent', messageListener);
    listeners.push({ event: 'CrossChainMessageSent', listener: messageListener });

    // PaymentRequestReceived - for indexing
    const receivedListener = this.createPaymentRequestReceivedListener(chainKey, contract);
    contract.on('PaymentRequestReceived', receivedListener);
    listeners.push({ event: 'PaymentRequestReceived', listener: receivedListener });

    // PaymentRequestFulfilled - for indexing
    const fulfilledListener = this.createPaymentRequestFulfilledListener(chainKey, contract);
    contract.on('PaymentRequestFulfilled', fulfilledListener);
    listeners.push({ event: 'PaymentRequestFulfilled', listener: fulfilledListener });

    // PaymentRequestCancelled - for indexing
    const cancelledListener = this.createPaymentRequestCancelledListener(chainKey, contract);
    contract.on('PaymentRequestCancelled', cancelledListener);
    listeners.push({ event: 'PaymentRequestCancelled', listener: cancelledListener });

    // MessageStatusUpdated - for indexing
    const statusListener = this.createMessageStatusUpdatedListener(chainKey, contract);
    contract.on('MessageStatusUpdated', statusListener);
    listeners.push({ event: 'MessageStatusUpdated', listener: statusListener });

    // CrossChainMessageDelivered - for indexing
    const deliveredListener = this.createCrossChainMessageDeliveredListener(chainKey, contract);
    contract.on('CrossChainMessageDelivered', deliveredListener);
    listeners.push({ event: 'CrossChainMessageDelivered', listener: deliveredListener });

    this.activeListeners.set(chainKey, listeners);
    logger.info(`✅ Setup ${listeners.length} event listeners for ${config.name}`);
  }

  /**
   * Create CrossChainMessageSent event listener
   */
  createCrossChainMessageSentListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return async (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, requester, target, targetChain, amount, token, message, expiryTime, messageHash] = args.slice(0, -1);

        logger.info(`📨 New cross-chain message on ${config.name}`, {
          requestId: requestId.toString(),
          requester,
          target,
          targetChain: targetChain.toString(),
          txHash: event.transactionHash
        });

        // Queue message for relaying
        await this.messageQueue.queueMessage({
          requestId: requestId.toString(),
          requester,
          target,
          amount: amount.toString(),
          token,
          originChain: config.chainId,
          targetChain: Number(targetChain),
          message,
          timestamp: Math.floor(Date.now() / 1000),
          expiryTime: Number(expiryTime),
          messageHash,
          originChainKey: chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          retryCount: 0
        });

        // Index the event
        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.SENT,
          requestId: requestId.toString(),
          requester,
          target,
          targetChain: Number(targetChain),
          amount: amount.toString(),
          token,
          message,
          expiryTime: Number(expiryTime),
          messageHash,
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now()
        });

        // Broadcast real-time update
        this.broadcastUpdate({
          eventType: 'message_sent',
          requestId: requestId.toString(),
          requester,
          target,
          amount: amount.toString(),
          token,
          originChain: config.name,
          targetChain: Number(targetChain),
          message,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });

      } catch (error) {
        logger.error(`❌ Error processing CrossChainMessageSent event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Create PaymentRequestReceived event listener
   */
  createPaymentRequestReceivedListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, requester, target, amount, token, originChain, message, timestamp, expiryTime, status] = args.slice(0, -1);

        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.RECEIVED,
          requestId: requestId.toString(),
          requester,
          target,
          amount: amount.toString(),
          token,
          originChain: Number(originChain),
          targetChain: config.chainId,
          message,
          timestamp: Number(timestamp) * 1000,
          expiryTime: Number(expiryTime) * 1000,
          status: Number(status),
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash
        });

        // Broadcast real-time update
        this.broadcastUpdate({
          eventType: 'message_received',
          requestId: requestId.toString(),
          requester,
          target,
          amount: amount.toString(),
          token,
          message,
          originChain: Number(originChain),
          targetChain: config.name,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });

        logger.info(`📥 Payment request received on ${config.name}`, {
          requestId: requestId.toString(),
          target,
          amount: amount.toString()
        });

      } catch (error) {
        logger.error(`❌ Error processing PaymentRequestReceived event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Create PaymentRequestFulfilled event listener
   */
  createPaymentRequestFulfilledListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, payer, amount, token, txHash] = args.slice(0, -1);

        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.FULFILLED,
          requestId: requestId.toString(),
          payer,
          amount: amount.toString(),
          token,
          fulfillmentTxHash: txHash,
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now()
        });

        // Broadcast real-time update
        this.broadcastUpdate({
          eventType: 'message_fulfilled',
          requestId: requestId.toString(),
          payer,
          amount: amount.toString(),
          token,
          fulfillmentTxHash: txHash,
          chain: config.name,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });

        logger.info(`✅ Payment request fulfilled on ${config.name}`, {
          requestId: requestId.toString(),
          payer,
          amount: amount.toString()
        });

      } catch (error) {
        logger.error(`❌ Error processing PaymentRequestFulfilled event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Create PaymentRequestCancelled event listener
   */
  createPaymentRequestCancelledListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, requester] = args.slice(0, -1);

        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.CANCELLED,
          requestId: requestId.toString(),
          requester,
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now()
        });

        // Broadcast real-time update
        this.broadcastUpdate({
          eventType: 'message_cancelled',
          requestId: requestId.toString(),
          requester,
          chain: config.name,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        });

        logger.info(`❌ Payment request cancelled on ${config.name}`, {
          requestId: requestId.toString(),
          requester
        });

      } catch (error) {
        logger.error(`❌ Error processing PaymentRequestCancelled event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Create MessageStatusUpdated event listener
   */
  createMessageStatusUpdatedListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, oldStatus, newStatus] = args.slice(0, -1);

        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.STATUS_UPDATED,
          requestId: requestId.toString(),
          oldStatus: Number(oldStatus),
          newStatus: Number(newStatus),
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now()
        });

        logger.info(`🔄 Message status updated on ${config.name}`, {
          requestId: requestId.toString(),
          oldStatus: Number(oldStatus),
          newStatus: Number(newStatus)
        });

      } catch (error) {
        logger.error(`❌ Error processing MessageStatusUpdated event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Create CrossChainMessageDelivered event listener
   */
  createCrossChainMessageDeliveredListener(chainKey, contract) {
    const config = getChainConfig(chainKey);

    return (...args) => {
      try {
        const event = args[args.length - 1];
        const [requestId, originChain, messageHash, status] = args.slice(0, -1);

        this.messageIndexer.indexMessage({
          type: EVENT_TYPES.DELIVERED,
          requestId: requestId.toString(),
          originChain: Number(originChain),
          messageHash,
          status: Number(status),
          chainKey,
          blockNumber: event.blockNumber,
          txHash: event.transactionHash,
          timestamp: Date.now()
        });

        logger.info(`📬 Cross-chain message delivered on ${config.name}`, {
          requestId: requestId.toString(),
          originChain: Number(originChain),
          status: Number(status)
        });

      } catch (error) {
        logger.error(`❌ Error processing CrossChainMessageDelivered event on ${chainKey}:`, error);
      }
    };
  }

  /**
   * Stop listening to events on a specific chain
   * @param {string} chainKey - Chain identifier
   */
  stopChainListeners(chainKey) {
    const listeners = this.activeListeners.get(chainKey);
    if (!listeners) return;

    const contract = this.providerManager.getContract(chainKey);
    if (!contract) return;

    listeners.forEach(({ event, listener }) => {
      contract.off(event, listener);
    });

    this.activeListeners.delete(chainKey);

    const config = getChainConfig(chainKey);
    logger.info(`🛑 Stopped event listeners for ${config.name}`);
  }

  /**
   * Stop all event listeners
   */
  stopAllListeners() {
    for (const chainKey of this.activeListeners.keys()) {
      this.stopChainListeners(chainKey);
    }

    logger.info('🛑 Stopped all event listeners');
  }

  /**
   * Restart listeners for a specific chain
   * @param {string} chainKey - Chain identifier
   */
  restartChainListeners(chainKey) {
    this.stopChainListeners(chainKey);

    const contract = this.providerManager.getContract(chainKey);
    if (contract) {
      this.setupChainListeners(chainKey, contract);
    }
  }

  /**
   * Get active listeners status
   * @returns {Object} Status of active listeners
   */
  getListenersStatus() {
    const status = {};

    for (const [chainKey, listeners] of this.activeListeners) {
      const config = getChainConfig(chainKey);
      status[chainKey] = {
        name: config.name,
        chainId: config.chainId,
        activeListeners: listeners.length,
        events: listeners.map(l => l.event)
      };
    }

    return status;
  }
}

module.exports = EventListener; 