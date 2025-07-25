/**
 * Session Manager
 * Handles user sessions and WebSocket subscriptions with database persistence
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// Simple UUID v4 generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class SessionManager {
    constructor(dbManager) {
        this.db = dbManager;
        this.statements = {};
        this.activeSessions = new Map(); // In-memory cache of active sessions
        this.initializeStatements();
    }

    /**
     * Initialize prepared statements
     */
    initializeStatements() {
        this.statements = {
            createSession: this.db.prepare(`
                INSERT INTO user_sessions (
                    user_address, session_id, chain_id, last_activity, subscriptions
                ) VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(session_id) DO UPDATE SET
                    user_address = excluded.user_address,
                    chain_id = excluded.chain_id,
                    last_activity = excluded.last_activity,
                    subscriptions = excluded.subscriptions,
                    updated_at = strftime('%s','now')
            `),

            getSession: this.db.prepare(`
                SELECT * FROM user_sessions WHERE session_id = ?
            `),

            getUserSessions: this.db.prepare(`
                SELECT * FROM user_sessions 
                WHERE user_address = ? 
                AND last_activity > ?
                ORDER BY last_activity DESC
            `),

            updateSessionActivity: this.db.prepare(`
                UPDATE user_sessions 
                SET last_activity = ?, updated_at = strftime('%s','now')
                WHERE session_id = ?
            `),

            updateSessionSubscriptions: this.db.prepare(`
                UPDATE user_sessions 
                SET subscriptions = ?, updated_at = strftime('%s','now')
                WHERE session_id = ?
            `),

            deleteSession: this.db.prepare(`
                DELETE FROM user_sessions WHERE session_id = ?
            `),

            cleanupOldSessions: this.db.prepare(`
                DELETE FROM user_sessions WHERE last_activity < ?
            `),

            getActiveSessionsCount: this.db.prepare(`
                SELECT COUNT(*) as count FROM user_sessions 
                WHERE last_activity > ?
            `),

            getSessionsByChain: this.db.prepare(`
                SELECT * FROM user_sessions 
                WHERE chain_id = ? 
                AND last_activity > ?
            `)
        };
    }

    /**
     * Create or update a user session
     * @param {string} userAddress - User's wallet address
     * @param {number} chainId - Connected chain ID
     * @param {Object} ws - WebSocket connection (optional)
     * @returns {string} Session ID
     */
    createSession(userAddress, chainId = null, ws = null) {
        try {
            const sessionId = generateUUID();
            const now = Math.floor(Date.now() / 1000);
            const subscriptions = JSON.stringify([]);

            // Store in database
            this.statements.createSession.run(
                userAddress.toLowerCase(),
                sessionId,
                chainId,
                now,
                subscriptions
            );

            // Store in memory cache with WebSocket reference
            this.activeSessions.set(sessionId, {
                sessionId,
                userAddress: userAddress.toLowerCase(),
                chainId,
                lastActivity: now,
                subscriptions: [],
                ws: ws || null,
                createdAt: now
            });

            logger.info('👤 Created user session', {
                sessionId: sessionId.substring(0, 8) + '...',
                userAddress,
                chainId,
                hasWebSocket: !!ws
            });

            return sessionId;

        } catch (error) {
            logger.error('❌ Failed to create session:', error);
            return null;
        }
    }

    /**
     * Get session by ID
     * @param {string} sessionId - Session ID
     * @returns {Object|null} Session data
     */
    getSession(sessionId) {
        try {
            // Check memory cache first
            if (this.activeSessions.has(sessionId)) {
                return this.activeSessions.get(sessionId);
            }

            // Fallback to database
            const session = this.statements.getSession.get(sessionId);
            if (!session) return null;

            const sessionData = {
                sessionId: session.session_id,
                userAddress: session.user_address,
                chainId: session.chain_id,
                lastActivity: session.last_activity,
                subscriptions: JSON.parse(session.subscriptions || '[]'),
                ws: null, // WebSocket connections are not persisted
                createdAt: session.created_at
            };

            // Add to memory cache
            this.activeSessions.set(sessionId, sessionData);

            return sessionData;

        } catch (error) {
            logger.error('❌ Failed to get session:', error);
            return null;
        }
    }

    /**
     * Update session activity
     * @param {string} sessionId - Session ID
     * @param {Object} ws - WebSocket connection (optional)
     */
    updateActivity(sessionId, ws = null) {
        try {
            const now = Math.floor(Date.now() / 1000);

            // Update database
            this.statements.updateSessionActivity.run(now, sessionId);

            // Update memory cache
            if (this.activeSessions.has(sessionId)) {
                const session = this.activeSessions.get(sessionId);
                session.lastActivity = now;
                if (ws) {
                    session.ws = ws;
                }
            }

            return true;

        } catch (error) {
            logger.error('❌ Failed to update session activity:', error);
            return false;
        }
    }

    /**
     * Add subscription to session
     * @param {string} sessionId - Session ID
     * @param {string} subscriptionType - Type of subscription
     * @param {Object} subscriptionData - Subscription data
     */
    addSubscription(sessionId, subscriptionType, subscriptionData = {}) {
        try {
            const session = this.getSession(sessionId);
            if (!session) return false;

            // Add subscription
            const subscription = {
                type: subscriptionType,
                data: subscriptionData,
                addedAt: Date.now()
            };

            session.subscriptions.push(subscription);

            // Update database
            this.statements.updateSessionSubscriptions.run(
                JSON.stringify(session.subscriptions),
                sessionId
            );

            // Update memory cache
            if (this.activeSessions.has(sessionId)) {
                this.activeSessions.get(sessionId).subscriptions = session.subscriptions;
            }

            logger.debug('📡 Added subscription to session', {
                sessionId: sessionId.substring(0, 8) + '...',
                type: subscriptionType,
                userAddress: session.userAddress
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to add subscription:', error);
            return false;
        }
    }

    /**
     * Remove subscription from session
     * @param {string} sessionId - Session ID
     * @param {string} subscriptionType - Type of subscription to remove
     */
    removeSubscription(sessionId, subscriptionType) {
        try {
            const session = this.getSession(sessionId);
            if (!session) return false;

            // Remove subscription
            session.subscriptions = session.subscriptions.filter(
                sub => sub.type !== subscriptionType
            );

            // Update database
            this.statements.updateSessionSubscriptions.run(
                JSON.stringify(session.subscriptions),
                sessionId
            );

            // Update memory cache
            if (this.activeSessions.has(sessionId)) {
                this.activeSessions.get(sessionId).subscriptions = session.subscriptions;
            }

            return true;

        } catch (error) {
            logger.error('❌ Failed to remove subscription:', error);
            return false;
        }
    }

    /**
     * Get sessions for a user
     * @param {string} userAddress - User's wallet address
     * @param {number} activeThreshold - Consider sessions active if activity within this many seconds
     * @returns {Array} Array of sessions
     */
    getUserSessions(userAddress, activeThreshold = 3600) {
        try {
            const cutoff = Math.floor(Date.now() / 1000) - activeThreshold;
            const sessions = this.statements.getUserSessions.all(
                userAddress.toLowerCase(),
                cutoff
            );

            return sessions.map(session => ({
                sessionId: session.session_id,
                userAddress: session.user_address,
                chainId: session.chain_id,
                lastActivity: session.last_activity,
                subscriptions: JSON.parse(session.subscriptions || '[]'),
                createdAt: session.created_at,
                isActive: this.activeSessions.has(session.session_id)
            }));

        } catch (error) {
            logger.error('❌ Failed to get user sessions:', error);
            return [];
        }
    }

    /**
     * Delete session
     * @param {string} sessionId - Session ID
     */
    deleteSession(sessionId) {
        try {
            // Remove from database
            this.statements.deleteSession.run(sessionId);

            // Remove from memory cache
            this.activeSessions.delete(sessionId);

            logger.debug('🗑️ Deleted session', {
                sessionId: sessionId.substring(0, 8) + '...'
            });

            return true;

        } catch (error) {
            logger.error('❌ Failed to delete session:', error);
            return false;
        }
    }

    /**
     * Get sessions that should receive updates for a specific user
     * @param {string} userAddress - User address
     * @returns {Array} Array of active sessions with WebSocket connections
     */
    getNotificationSessions(userAddress) {
        const sessions = [];

        for (const [sessionId, session] of this.activeSessions) {
            if (session.userAddress === userAddress.toLowerCase() && session.ws) {
                // Check if WebSocket is still open
                if (session.ws.readyState === 1) { // WebSocket.OPEN
                    sessions.push(session);
                } else {
                    // Clean up closed connections
                    this.activeSessions.delete(sessionId);
                }
            }
        }

        return sessions;
    }

    /**
     * Get sessions by chain ID
     * @param {number} chainId - Chain ID
     * @param {number} activeThreshold - Active threshold in seconds
     * @returns {Array} Array of sessions
     */
    getSessionsByChain(chainId, activeThreshold = 3600) {
        try {
            const cutoff = Math.floor(Date.now() / 1000) - activeThreshold;
            const sessions = this.statements.getSessionsByChain.all(chainId, cutoff);

            return sessions.map(session => ({
                sessionId: session.session_id,
                userAddress: session.user_address,
                chainId: session.chain_id,
                lastActivity: session.last_activity,
                subscriptions: JSON.parse(session.subscriptions || '[]'),
                isActive: this.activeSessions.has(session.session_id)
            }));

        } catch (error) {
            logger.error('❌ Failed to get sessions by chain:', error);
            return [];
        }
    }

    /**
     * Clean up old sessions
     * @param {number} maxAge - Maximum age in seconds
     */
    cleanupOldSessions(maxAge = 24 * 60 * 60) { // 24 hours default
        try {
            const cutoff = Math.floor(Date.now() / 1000) - maxAge;
            const result = this.statements.cleanupOldSessions.run(cutoff);

            // Also clean up memory cache
            for (const [sessionId, session] of this.activeSessions) {
                if (session.lastActivity < cutoff) {
                    this.activeSessions.delete(sessionId);
                }
            }

            if (result.changes > 0) {
                logger.info('🧹 Cleaned up old sessions', {
                    deleted: result.changes,
                    activeInMemory: this.activeSessions.size
                });
            }

            return result.changes;

        } catch (error) {
            logger.error('❌ Failed to cleanup old sessions:', error);
            return 0;
        }
    }

    /**
     * Get session statistics
     */
    getStats() {
        try {
            const activeThreshold = Math.floor(Date.now() / 1000) - 3600; // 1 hour
            const activeCount = this.statements.getActiveSessionsCount.get(activeThreshold).count;

            return {
                totalSessions: this.activeSessions.size,
                activeSessions: activeCount,
                memoryCache: this.activeSessions.size,
                sessionsWithWebSocket: Array.from(this.activeSessions.values())
                    .filter(session => session.ws && session.ws.readyState === 1).length
            };

        } catch (error) {
            logger.error('❌ Failed to get session stats:', error);
            return {
                totalSessions: 0,
                activeSessions: 0,
                memoryCache: 0,
                sessionsWithWebSocket: 0
            };
        }
    }
}

module.exports = SessionManager; 