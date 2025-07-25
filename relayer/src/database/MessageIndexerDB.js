/**
 * Database-backed Message Indexer
 * Provides persistent storage for indexed messages and events
 */

const logger = require('../utils/logger');
const { getAllChains, getChainConfig } = require('../config/chains');
const { EVENT_TYPES } = require('../config/constants');

class MessageIndexerDB {
    constructor(dbManager) {
        this.db = dbManager;
        this.statements = {};
        this.initializeStatements();
    }

    /**
     * Initialize prepared statements
     */
    initializeStatements() {
        this.statements = {
            // Message operations
            upsertIndexedMessage: this.db.prepare(`
                INSERT INTO indexed_messages (
                    request_id, status, origin_chain, target_chain, 
                    message_hash, delivery_status, last_update
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    status = excluded.status,
                    origin_chain = excluded.origin_chain,
                    target_chain = excluded.target_chain,
                    message_hash = excluded.message_hash,
                    delivery_status = excluded.delivery_status,
                    last_update = excluded.last_update,
                    updated_at = strftime('%s','now')
            `),

            getIndexedMessage: this.db.prepare(`
                SELECT * FROM indexed_messages WHERE request_id = ?
            `),

            // Event operations
            addMessageEvent: this.db.prepare(`
                INSERT INTO message_events (
                    request_id, event_type, chain_key, requester, target, payer,
                    amount, token, message, origin_chain, target_chain,
                    timestamp, expiry_time, message_hash, fulfillment_tx_hash,
                    block_number, tx_hash, indexed_at, old_status, new_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),

            getMessageEvents: this.db.prepare(`
                SELECT * FROM message_events 
                WHERE request_id = ? 
                ORDER BY indexed_at ASC
            `),

            // User message queries
            getUserMessages: this.db.prepare(`
                SELECT DISTINCT im.*, 
                       GROUP_CONCAT(me.event_type) as event_types,
                       GROUP_CONCAT(me.chain_key) as chains
                FROM indexed_messages im
                LEFT JOIN message_events me ON im.request_id = me.request_id
                WHERE me.requester = ? OR me.target = ? OR me.payer = ?
                GROUP BY im.request_id
                ORDER BY im.last_update DESC
                LIMIT ? OFFSET ?
            `),

            getUserMessagesWithFilters: this.db.prepare(`
                SELECT DISTINCT im.*, 
                       GROUP_CONCAT(me.event_type) as event_types,
                       GROUP_CONCAT(me.chain_key) as chains
                FROM indexed_messages im
                LEFT JOIN message_events me ON im.request_id = me.request_id
                WHERE (me.requester = ? OR me.target = ? OR me.payer = ?)
                AND (? IS NULL OR im.status = ?)
                AND (? IS NULL OR me.chain_key = ?)
                GROUP BY im.request_id
                ORDER BY im.last_update DESC
                LIMIT ? OFFSET ?
            `),

            countUserMessages: this.db.prepare(`
                SELECT COUNT(DISTINCT im.request_id) as count
                FROM indexed_messages im
                LEFT JOIN message_events me ON im.request_id = me.request_id
                WHERE me.requester = ? OR me.target = ? OR me.payer = ?
            `),

            // System state operations
            setSystemState: this.db.prepare(`
                INSERT INTO system_state (key, value) 
                VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    updated_at = strftime('%s','now')
            `),

            getSystemState: this.db.prepare(`
                SELECT value FROM system_state WHERE key = ?
            `),

            // Analytics queries
            getMessageStats: this.db.prepare(`
                SELECT 
                    COUNT(*) as total_messages,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                    COUNT(CASE WHEN status = 'fulfilled' THEN 1 END) as fulfilled,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                    COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as sent,
                    COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered
                FROM indexed_messages
            `),

            getChainDistribution: this.db.prepare(`
                SELECT 
                    chain_key,
                    COUNT(*) as count
                FROM message_events
                GROUP BY chain_key
                ORDER BY count DESC
            `),

            searchMessages: this.db.prepare(`
                SELECT DISTINCT im.*
                FROM indexed_messages im
                LEFT JOIN message_events me ON im.request_id = me.request_id
                WHERE (? IS NULL OR me.requester LIKE ?)
                AND (? IS NULL OR me.target LIKE ?)
                AND (? IS NULL OR me.token LIKE ?)
                AND (? IS NULL OR im.status = ?)
                AND (? IS NULL OR me.chain_key = ?)
                AND (? IS NULL OR me.indexed_at >= ?)
                AND (? IS NULL OR me.indexed_at <= ?)
                ORDER BY im.last_update DESC
                LIMIT ? OFFSET ?
            `)
        };
    }

    /**
     * Index a message event
     * @param {Object} messageData - Message event data
     */
    async indexMessage(messageData) {
        try {
            const transaction = this.db.transaction(() => {
                // Update or create indexed message record
                this.updateIndexedMessage(messageData);

                // Add event record
                this.addEventRecord(messageData);
            });

            transaction();

            logger.debug(`📊 Indexed ${messageData.type} event in database`, {
                requestId: messageData.requestId,
                type: messageData.type,
                chainKey: messageData.chainKey
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to index message in database:', error);
            return false;
        }
    }

    /**
     * Update indexed message record
     * @param {Object} messageData - Message event data
     */
    updateIndexedMessage(messageData) {
        const requestId = messageData.requestId;

        // Get existing message or create new one
        let existingMessage = this.statements.getIndexedMessage.get(requestId);

        const crossChainData = {
            originChain: existingMessage?.origin_chain || null,
            targetChain: existingMessage?.target_chain || null,
            messageHash: existingMessage?.message_hash || null,
            deliveryStatus: existingMessage?.delivery_status || 'unknown'
        };

        // Update cross-chain data based on event type
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

        // Determine status
        let status = existingMessage?.status || 'pending';
        if (messageData.type === EVENT_TYPES.FULFILLED) status = 'fulfilled';
        else if (messageData.type === EVENT_TYPES.CANCELLED) status = 'cancelled';

        // Update database
        this.statements.upsertIndexedMessage.run(
            requestId,
            status,
            crossChainData.originChain,
            crossChainData.targetChain,
            crossChainData.messageHash,
            crossChainData.deliveryStatus,
            Date.now()
        );
    }

    /**
     * Add event record
     * @param {Object} messageData - Message event data
     */
    addEventRecord(messageData) {
        this.statements.addMessageEvent.run(
            messageData.requestId,
            messageData.type,
            messageData.chainKey,
            messageData.requester || null,
            messageData.target || null,
            messageData.payer || null,
            messageData.amount || null,
            messageData.token || null,
            messageData.message || null,
            messageData.originChain || null,
            messageData.targetChain || null,
            messageData.timestamp || null,
            messageData.expiryTime || null,
            messageData.messageHash || null,
            messageData.fulfillmentTxHash || null,
            messageData.blockNumber || null,
            messageData.txHash || null,
            Date.now(),
            messageData.oldStatus || null,
            messageData.newStatus || null
        );
    }

    /**
     * Get messages by user address
     * @param {string} userAddress - User's address
     * @param {Object} options - Query options
     */
    getMessagesByUser(userAddress, options = {}) {
        try {
            const { limit = 50, offset = 0, status, chainKey } = options;
            const userAddressLower = userAddress.toLowerCase();

            let messages;
            if (status || chainKey) {
                messages = this.statements.getUserMessagesWithFilters.all(
                    userAddressLower, userAddressLower, userAddressLower,
                    status, status,
                    chainKey, chainKey,
                    limit, offset
                );
            } else {
                messages = this.statements.getUserMessages.all(
                    userAddressLower, userAddressLower, userAddressLower,
                    limit, offset
                );
            }

            // Get total count
            const totalCount = this.statements.countUserMessages.get(
                userAddressLower, userAddressLower, userAddressLower
            ).count;

            // Enhance messages with events and cross-chain context
            const enhancedMessages = messages.map(msg => this.enhanceMessage(msg));

            return {
                messages: enhancedMessages,
                total: totalCount,
                hasMore: offset + limit < totalCount,
                crossChainSummary: this.generateCrossChainSummary(enhancedMessages, userAddressLower)
            };

        } catch (error) {
            logger.error('❌ Failed to get user messages from database:', error);
            return { messages: [], total: 0, hasMore: false };
        }
    }

    /**
     * Enhance message with events and cross-chain context
     * @param {Object} msg - Database message record
     */
    enhanceMessage(msg) {
        // Get all events for this message
        const events = this.statements.getMessageEvents.all(msg.request_id);

        // Generate summary
        const summary = this.generateRequestSummary(msg, events);

        return {
            requestId: msg.request_id,
            status: msg.status,
            events: events.map(event => ({
                type: event.event_type,
                chainKey: event.chain_key,
                requester: event.requester,
                target: event.target,
                payer: event.payer,
                amount: event.amount,
                token: event.token,
                message: event.message,
                originChain: event.origin_chain,
                targetChain: event.target_chain,
                timestamp: event.timestamp,
                expiryTime: event.expiry_time,
                messageHash: event.message_hash,
                fulfillmentTxHash: event.fulfillment_tx_hash,
                blockNumber: event.block_number,
                txHash: event.tx_hash,
                indexedAt: event.indexed_at
            })),
            lastUpdate: msg.last_update,
            summary: {
                ...summary,
                crossChainContext: {
                    originChainKey: msg.origin_chain,
                    targetChainKey: msg.target_chain,
                    deliveryStatus: msg.delivery_status,
                    messageHash: msg.message_hash,
                    isCrossChain: msg.origin_chain !== msg.target_chain,
                    allInvolvedChains: [...new Set(events.map(e => e.chain_key))],
                    userRole: this.getUserRoleInRequest(msg.request_id, events)
                }
            }
        };
    }

    /**
     * Generate request summary from database records
     * @param {Object} msg - Message record
     * @param {Array} events - Event records
     */
    generateRequestSummary(msg, events) {
        const sentEvent = events.find(e => e.event_type === EVENT_TYPES.SENT);
        const receivedEvent = events.find(e => e.event_type === EVENT_TYPES.RECEIVED);
        const fulfilledEvent = events.find(e => e.event_type === EVENT_TYPES.FULFILLED);
        const cancelledEvent = events.find(e => e.event_type === EVENT_TYPES.CANCELLED);
        const deliveredEvent = events.find(e => e.event_type === EVENT_TYPES.DELIVERED);

        // Determine origin and target chains
        let originChainName = null;
        let targetChainName = null;

        if (msg.origin_chain) {
            originChainName = getChainConfig(msg.origin_chain)?.name;
        }
        if (msg.target_chain) {
            targetChainName = getChainConfig(msg.target_chain)?.name;
        }

        return {
            requester: sentEvent?.requester || receivedEvent?.requester,
            target: sentEvent?.target || receivedEvent?.target,
            amount: sentEvent?.amount || receivedEvent?.amount,
            token: sentEvent?.token || receivedEvent?.token,
            message: sentEvent?.message || receivedEvent?.message,
            originChain: originChainName,
            targetChain: targetChainName,
            status: msg.status,
            createdAt: sentEvent?.timestamp || receivedEvent?.timestamp,
            fulfilledAt: fulfilledEvent?.timestamp,
            cancelledAt: cancelledEvent?.timestamp,
            deliveredAt: deliveredEvent?.timestamp,
            expiryTime: sentEvent?.expiry_time || receivedEvent?.expiry_time,
            eventCount: events.length,
            lastEventType: events[events.length - 1]?.event_type,
            allChains: [...new Set(events.map(e => getChainConfig(e.chain_key)?.name).filter(Boolean))],
            txHashes: [...new Set(events.map(e => e.tx_hash).filter(Boolean))]
        };
    }

    /**
     * Determine user's role in a request
     * @param {string} requestId - Request ID
     * @param {Array} events - Event records
     */
    getUserRoleInRequest(requestId, events) {
        const roles = [];

        if (events.some(e => e.requester)) {
            roles.push('requester');
        }
        if (events.some(e => e.target)) {
            roles.push('target');
        }
        if (events.some(e => e.payer)) {
            roles.push('payer');
        }

        return roles.join(', ') || 'unknown';
    }

    /**
     * Generate cross-chain summary
     * @param {Array} userMessages - User's messages
     * @param {string} userAddress - User address
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
            const context = message.summary.crossChainContext;

            if (context.isCrossChain) {
                summary.crossChainRequests++;
            } else {
                summary.localRequests++;
            }

            // Chain distribution
            for (const chainKey of context.allInvolvedChains) {
                const chainName = getChainConfig(chainKey)?.name || chainKey;
                summary.chainDistribution[chainName] = (summary.chainDistribution[chainName] || 0) + 1;
            }

            // Status distribution
            summary.statusDistribution[message.status] = (summary.statusDistribution[message.status] || 0) + 1;

            // Role distribution
            const roles = context.userRole.split(', ');
            for (const role of roles) {
                if (summary.roleDistribution[role] !== undefined) {
                    summary.roleDistribution[role]++;
                }
            }
        }

        return summary;
    }

    /**
     * Get request history by ID
     * @param {string} requestId - Request ID
     */
    getRequestHistory(requestId) {
        try {
            const message = this.statements.getIndexedMessage.get(requestId);
            if (!message) return null;

            const events = this.statements.getMessageEvents.all(requestId);

            return this.enhanceMessage(message);

        } catch (error) {
            logger.error('❌ Failed to get request history from database:', error);
            return null;
        }
    }

    /**
     * Set system state (like last processed block numbers)
     * @param {string} key - State key
     * @param {string} value - State value
     */
    setSystemState(key, value) {
        try {
            this.statements.setSystemState.run(key, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error('❌ Failed to set system state:', error);
            return false;
        }
    }

    /**
     * Get system state
     * @param {string} key - State key
     */
    getSystemState(key) {
        try {
            const result = this.statements.getSystemState.get(key);
            return result ? JSON.parse(result.value) : null;
        } catch (error) {
            logger.error('❌ Failed to get system state:', error);
            return null;
        }
    }

    /**
     * Get statistics
     */
    getStats() {
        try {
            const messageStats = this.statements.getMessageStats.get();
            const chainDistribution = this.statements.getChainDistribution.all();

            return {
                totalIndexedRequests: messageStats.total_messages,
                pendingRequests: messageStats.pending,
                fulfilledRequests: messageStats.fulfilled,
                cancelledRequests: messageStats.cancelled,
                sentMessages: messageStats.sent,
                deliveredMessages: messageStats.delivered,
                chainDistribution: chainDistribution.reduce((acc, row) => {
                    acc[row.chain_key] = row.count;
                    return acc;
                }, {})
            };

        } catch (error) {
            logger.error('❌ Failed to get indexer stats:', error);
            return {
                totalIndexedRequests: 0,
                pendingRequests: 0,
                fulfilledRequests: 0,
                cancelledRequests: 0,
                sentMessages: 0,
                deliveredMessages: 0,
                chainDistribution: {}
            };
        }
    }

    /**
     * Clear all indexed data
     */
    clear() {
        try {
            this.db.exec('DELETE FROM indexed_messages');
            this.db.exec('DELETE FROM message_events');
            logger.info('🗑️ Cleared all indexed data from database');
            return true;
        } catch (error) {
            logger.error('❌ Failed to clear indexed data:', error);
            return false;
        }
    }
}

module.exports = MessageIndexerDB; 