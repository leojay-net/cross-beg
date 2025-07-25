/**
 * Queue Manager
 * Provides persistent storage for message queues
 */

const logger = require('../utils/logger');
const { getAllChains } = require('../config/chains');

class QueueManager {
    constructor(dbManager) {
        this.db = dbManager;
        this.statements = {};
        this.initializeStatements();
    }

    /**
     * Initialize prepared statements for better performance
     */
    initializeStatements() {
        this.statements = {
            // Queue operations
            addToQueue: this.db.prepare(`
                INSERT INTO message_queue (
                    request_id, requester, target, amount, token, origin_chain,
                    target_chain, message, timestamp, expiry_time, message_hash,
                    origin_chain_key, block_number, tx_hash, retry_count,
                    priority, status, queued_at, next_retry
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),

            getNextMessage: this.db.prepare(`
                SELECT * FROM message_queue 
                WHERE status = 'queued' 
                AND (next_retry IS NULL OR next_retry <= ?)
                ORDER BY priority DESC, queued_at ASC 
                LIMIT 1
            `),

            getNextMessageByChain: this.db.prepare(`
                SELECT * FROM message_queue 
                WHERE status = 'queued' 
                AND target_chain = ?
                AND (next_retry IS NULL OR next_retry <= ?)
                ORDER BY priority DESC, queued_at ASC 
                LIMIT 1
            `),

            updateMessageStatus: this.db.prepare(`
                UPDATE message_queue 
                SET status = ?, updated_at = strftime('%s','now')
                WHERE id = ?
            `),

            addToRetryQueue: this.db.prepare(`
                UPDATE message_queue 
                SET retry_count = retry_count + 1, 
                    next_retry = ?,
                    status = 'retry',
                    updated_at = strftime('%s','now')
                WHERE id = ?
            `),

            getQueueStats: this.db.prepare(`
                SELECT 
                    status,
                    priority,
                    target_chain,
                    COUNT(*) as count
                FROM message_queue 
                GROUP BY status, priority, target_chain
            `),

            getQueueByStatus: this.db.prepare(`
                SELECT * FROM message_queue 
                WHERE status = ? 
                ORDER BY queued_at ASC 
                LIMIT ?
            `),

            deleteMessage: this.db.prepare(`
                DELETE FROM message_queue WHERE id = ?
            `),

            cleanupExpiredMessages: this.db.prepare(`
                UPDATE message_queue 
                SET status = 'expired', updated_at = strftime('%s','now')
                WHERE expiry_time < ? AND status IN ('queued', 'retry')
            `),

            getRetryMessages: this.db.prepare(`
                SELECT * FROM message_queue 
                WHERE status = 'retry' 
                AND next_retry <= ?
                ORDER BY priority DESC, next_retry ASC
            `),

            moveRetryToQueue: this.db.prepare(`
                UPDATE message_queue 
                SET status = 'queued', next_retry = NULL, updated_at = strftime('%s','now')
                WHERE id = ?
            `)
        };
    }

    /**
     * Add message to queue
     * @param {Object} message - Message to queue
     * @param {boolean} isPriority - Whether this is a priority message
     */
    async queueMessage(message, isPriority = false) {
        try {
            // Check if message is expired
            if (Date.now() / 1000 > message.expiryTime) {
                logger.warn(`⏰ Message expired, not queuing: ${message.requestId}`);
                return false;
            }

            const now = Math.floor(Date.now() / 1000);

            const result = this.statements.addToQueue.run(
                message.requestId,
                message.requester,
                message.target,
                message.amount,
                message.token,
                message.originChain,
                message.targetChain,
                message.message || null,
                message.timestamp,
                message.expiryTime,
                message.messageHash || null,
                message.originChainKey || null,
                message.blockNumber || null,
                message.txHash || null,
                message.retryCount || 0,
                isPriority ? 1 : 0,
                'queued',
                now,
                null
            );

            logger.info(`📥 Queued message in database`, {
                requestId: message.requestId,
                targetChain: message.targetChain,
                isPriority,
                dbId: result.lastInsertRowid
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to queue message in database:', error);
            return false;
        }
    }

    /**
     * Get next message from queue with priority and chain balancing
     * @param {number} preferredChainId - Preferred chain ID for processing
     */
    getNextMessage(preferredChainId = null) {
        try {
            const now = Math.floor(Date.now() / 1000);
            let message = null;

            // Try preferred chain first if specified
            if (preferredChainId) {
                message = this.statements.getNextMessageByChain.get(preferredChainId, now);
            }

            // If no message from preferred chain, get any available message
            if (!message) {
                message = this.statements.getNextMessage.get(now);
            }

            if (message) {
                // Mark as processing
                this.statements.updateMessageStatus.run('processing', message.id);

                // Convert database row to message object
                return this.dbRowToMessage(message);
            }

            return null;

        } catch (error) {
            logger.error('❌ Failed to get next message from database:', error);
            return null;
        }
    }

    /**
     * Add message to retry queue
     * @param {Object} message - Message to retry
     * @param {number} retryDelay - Delay before retry in milliseconds
     */
    addToRetryQueue(message, retryDelay = 5000) {
        try {
            const nextRetry = Math.floor((Date.now() + retryDelay) / 1000);

            this.statements.addToRetryQueue.run(nextRetry, message.dbId || message.id);

            logger.info(`🔄 Added message to retry queue`, {
                requestId: message.requestId,
                retryCount: (message.retryCount || 0) + 1,
                nextRetry: new Date(nextRetry * 1000).toISOString()
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to add message to retry queue:', error);
            return false;
        }
    }

    /**
     * Process retry queue and move ready messages back to main queue
     */
    processRetryQueue() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const retryMessages = this.statements.getRetryMessages.all(now);

            if (retryMessages.length > 0) {
                logger.info(`🔄 Processing ${retryMessages.length} retry messages`);

                for (const message of retryMessages) {
                    this.statements.moveRetryToQueue.run(message.id);
                }
            }

            return retryMessages.length;

        } catch (error) {
            logger.error('❌ Failed to process retry queue:', error);
            return 0;
        }
    }

    /**
     * Mark message as completed
     * @param {Object} message - Message that was completed
     * @param {boolean} success - Whether processing was successful
     */
    markMessageCompleted(message, success = true) {
        try {
            const status = success ? 'completed' : 'failed';
            this.statements.updateMessageStatus.run(status, message.dbId || message.id);

            logger.debug(`✅ Marked message as ${status}`, {
                requestId: message.requestId,
                success
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to mark message as completed:', error);
            return false;
        }
    }

    /**
     * Clean up expired messages
     */
    cleanupExpiredMessages() {
        try {
            const now = Math.floor(Date.now() / 1000);
            const result = this.statements.cleanupExpiredMessages.run(now);

            if (result.changes > 0) {
                logger.info(`🧹 Cleaned up ${result.changes} expired messages`);
            }

            return result.changes;

        } catch (error) {
            logger.error('❌ Failed to cleanup expired messages:', error);
            return 0;
        }
    }

    /**
     * Get queue statistics
     */
    getStats() {
        try {
            const rawStats = this.statements.getQueueStats.all();

            const stats = {
                total: 0,
                byStatus: {},
                byChain: {},
                priorityMessages: 0
            };

            for (const row of rawStats) {
                stats.total += row.count;

                if (!stats.byStatus[row.status]) {
                    stats.byStatus[row.status] = 0;
                }
                stats.byStatus[row.status] += row.count;

                if (row.priority) {
                    stats.priorityMessages += row.count;
                }

                // Get chain name
                const chainName = Object.values(getAllChains())
                    .find(chain => chain.chainId === row.target_chain)?.name || `Chain ${row.target_chain}`;

                if (!stats.byChain[chainName]) {
                    stats.byChain[chainName] = 0;
                }
                stats.byChain[chainName] += row.count;
            }

            return stats;

        } catch (error) {
            logger.error('❌ Failed to get queue stats:', error);
            return { total: 0, byStatus: {}, byChain: {}, priorityMessages: 0 };
        }
    }

    /**
     * Get messages by status (for debugging)
     * @param {string} status - Message status
     * @param {number} limit - Maximum number of messages to return
     */
    getMessagesByStatus(status, limit = 10) {
        try {
            const messages = this.statements.getQueueByStatus.all(status, limit);
            return messages.map(msg => this.dbRowToMessage(msg));

        } catch (error) {
            logger.error('❌ Failed to get messages by status:', error);
            return [];
        }
    }

    /**
     * Convert database row to message object
     * @param {Object} row - Database row
     */
    dbRowToMessage(row) {
        return {
            dbId: row.id,
            requestId: row.request_id,
            requester: row.requester,
            target: row.target,
            amount: row.amount,
            token: row.token,
            originChain: row.origin_chain,
            targetChain: row.target_chain,
            message: row.message,
            timestamp: row.timestamp,
            expiryTime: row.expiry_time,
            messageHash: row.message_hash,
            originChainKey: row.origin_chain_key,
            blockNumber: row.block_number,
            txHash: row.tx_hash,
            retryCount: row.retry_count,
            priority: Boolean(row.priority),
            status: row.status,
            queuedAt: row.queued_at,
            nextRetry: row.next_retry
        };
    }

    /**
     * Clear all queues (for testing/debugging)
     */
    clear() {
        try {
            this.db.exec('DELETE FROM message_queue');
            logger.info('🗑️ Cleared all message queues from database');
            return true;

        } catch (error) {
            logger.error('❌ Failed to clear message queues:', error);
            return false;
        }
    }
}

module.exports = QueueManager; 