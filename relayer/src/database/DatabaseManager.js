/**
 * Database Manager
 * Handles persistent storage for queues, messages, and user data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

class DatabaseManager {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(process.cwd(), 'data', 'relayer.db');
        this.db = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the database and create tables
     */
    async initialize() {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(this.dbPath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // Open database connection
            this.db = new Database(this.dbPath);
            this.db.pragma('journal_mode = WAL');
            this.db.pragma('synchronous = NORMAL');
            this.db.pragma('cache_size = 1000');
            this.db.pragma('temp_store = memory');

            // Create tables
            await this.createTables();

            this.isInitialized = true;
            logger.info('✅ Database initialized successfully', {
                path: this.dbPath,
                tables: this.getTableNames()
            });

        } catch (error) {
            logger.error('❌ Failed to initialize database:', error);
            throw error;
        }
    }

    /**
     * Create all necessary tables
     */
    async createTables() {
        const tables = [
            // Message Queue Table
            `CREATE TABLE IF NOT EXISTS message_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                requester TEXT NOT NULL,
                target TEXT NOT NULL,
                amount TEXT NOT NULL,
                token TEXT NOT NULL,
                origin_chain INTEGER NOT NULL,
                target_chain INTEGER NOT NULL,
                message TEXT,
                timestamp INTEGER NOT NULL,
                expiry_time INTEGER NOT NULL,
                message_hash TEXT,
                origin_chain_key TEXT,
                block_number INTEGER,
                tx_hash TEXT,
                retry_count INTEGER DEFAULT 0,
                priority BOOLEAN DEFAULT FALSE,
                status TEXT DEFAULT 'queued',
                queued_at INTEGER NOT NULL,
                next_retry INTEGER,
                created_at INTEGER DEFAULT (strftime('%s','now')),
                updated_at INTEGER DEFAULT (strftime('%s','now'))
            )`,

            // Indexed Messages Table
            `CREATE TABLE IF NOT EXISTS indexed_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                origin_chain TEXT,
                target_chain TEXT,
                message_hash TEXT,
                delivery_status TEXT DEFAULT 'unknown',
                last_update INTEGER NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s','now')),
                updated_at INTEGER DEFAULT (strftime('%s','now')),
                UNIQUE(request_id)
            )`,

            // Message Events Table
            `CREATE TABLE IF NOT EXISTS message_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                request_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                chain_key TEXT NOT NULL,
                requester TEXT,
                target TEXT,
                payer TEXT,
                amount TEXT,
                token TEXT,
                message TEXT,
                origin_chain INTEGER,
                target_chain INTEGER,
                timestamp INTEGER,
                expiry_time INTEGER,
                message_hash TEXT,
                fulfillment_tx_hash TEXT,
                block_number INTEGER,
                tx_hash TEXT,
                indexed_at INTEGER NOT NULL,
                old_status INTEGER,
                new_status INTEGER,
                created_at INTEGER DEFAULT (strftime('%s','now'))
            )`,

            // User Sessions Table (for WebSocket subscriptions)
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_address TEXT NOT NULL,
                session_id TEXT NOT NULL,
                chain_id INTEGER,
                last_activity INTEGER NOT NULL,
                subscriptions TEXT, -- JSON array of subscription types
                created_at INTEGER DEFAULT (strftime('%s','now')),
                updated_at INTEGER DEFAULT (strftime('%s','now')),
                UNIQUE(session_id)
            )`,

            // System State Table (for block numbers, etc.)
            `CREATE TABLE IF NOT EXISTS system_state (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT NOT NULL UNIQUE,
                value TEXT NOT NULL,
                updated_at INTEGER DEFAULT (strftime('%s','now'))
            )`,

            // Chain Processing Stats
            `CREATE TABLE IF NOT EXISTS chain_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                chain_id INTEGER NOT NULL,
                chain_key TEXT NOT NULL,
                messages_processed INTEGER DEFAULT 0,
                last_processed_block INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                last_error TEXT,
                last_error_at INTEGER,
                updated_at INTEGER DEFAULT (strftime('%s','now')),
                UNIQUE(chain_id)
            )`
        ];

        // Create indexes
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)',
            'CREATE INDEX IF NOT EXISTS idx_message_queue_target_chain ON message_queue(target_chain)',
            'CREATE INDEX IF NOT EXISTS idx_message_queue_priority ON message_queue(priority, queued_at)',
            'CREATE INDEX IF NOT EXISTS idx_message_queue_retry ON message_queue(next_retry)',
            'CREATE INDEX IF NOT EXISTS idx_indexed_messages_request_id ON indexed_messages(request_id)',
            'CREATE INDEX IF NOT EXISTS idx_message_events_request_id ON message_events(request_id)',
            'CREATE INDEX IF NOT EXISTS idx_message_events_type ON message_events(event_type)',
            'CREATE INDEX IF NOT EXISTS idx_message_events_addresses ON message_events(requester, target, payer)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_address ON user_sessions(user_address)',
            'CREATE INDEX IF NOT EXISTS idx_user_sessions_activity ON user_sessions(last_activity)',
            'CREATE INDEX IF NOT EXISTS idx_system_state_key ON system_state(key)'
        ];

        // Execute table creation
        for (const tableSQL of tables) {
            this.db.exec(tableSQL);
        }

        // Execute index creation
        for (const indexSQL of indexes) {
            this.db.exec(indexSQL);
        }

        logger.debug('📊 Database tables and indexes created');
    }

    /**
     * Get all table names
     */
    getTableNames() {
        const stmt = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'");
        return stmt.all().map(row => row.name);
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
            logger.info('🔒 Database connection closed');
        }
    }

    /**
     * Get database statistics
     */
    getStats() {
        if (!this.isInitialized) return null;

        const stats = {};
        const tables = this.getTableNames();

        for (const table of tables) {
            if (table !== 'sqlite_sequence') {
                const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
                stats[table] = stmt.get().count;
            }
        }

        return {
            tables: stats,
            dbSize: this.getDatabaseSize(),
            path: this.dbPath
        };
    }

    /**
     * Get database file size
     */
    getDatabaseSize() {
        try {
            const stats = fs.statSync(this.dbPath);
            return {
                bytes: stats.size,
                readable: this.formatBytes(stats.size)
            };
        } catch (error) {
            return { bytes: 0, readable: '0 B' };
        }
    }

    /**
     * Format bytes to human readable string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Execute a transaction
     */
    transaction(fn) {
        if (!this.isInitialized) throw new Error('Database not initialized');
        return this.db.transaction(fn);
    }

    /**
     * Prepare a statement
     */
    prepare(sql) {
        if (!this.isInitialized) throw new Error('Database not initialized');
        return this.db.prepare(sql);
    }

    /**
     * Execute SQL directly
     */
    exec(sql) {
        if (!this.isInitialized) throw new Error('Database not initialized');
        return this.db.exec(sql);
    }

    /**
     * Clean up old data (maintenance)
     */
    async cleanup() {
        if (!this.isInitialized) return;

        const transaction = this.db.transaction(() => {
            // Clean up old completed queue messages (older than 7 days)
            const sevenDaysAgo = Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60);

            const cleanupQueue = this.db.prepare(`
                DELETE FROM message_queue 
                WHERE status IN ('completed', 'failed') 
                AND updated_at < ?
            `);
            const queueDeleted = cleanupQueue.run(sevenDaysAgo).changes;

            // Clean up old user sessions (older than 24 hours)
            const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);

            const cleanupSessions = this.db.prepare(`
                DELETE FROM user_sessions 
                WHERE last_activity < ?
            `);
            const sessionsDeleted = cleanupSessions.run(oneDayAgo).changes;

            // Clean up old message events (keep only last 30 days)
            const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

            const cleanupEvents = this.db.prepare(`
                DELETE FROM message_events 
                WHERE created_at < ?
            `);
            const eventsDeleted = cleanupEvents.run(thirtyDaysAgo).changes;

            return { queueDeleted, sessionsDeleted, eventsDeleted };
        });

        const result = transaction();

        logger.info('🧹 Database cleanup completed', {
            queueDeleted: result.queueDeleted,
            sessionsDeleted: result.sessionsDeleted,
            eventsDeleted: result.eventsDeleted
        });

        // Vacuum database to reclaim space
        this.db.exec('VACUUM');

        return result;
    }
}

module.exports = DatabaseManager; 