/**
 * Logger Utility Module
 * Centralized logging configuration using Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
        let logMessage = `${timestamp} [${level}]`;

        if (service) {
            logMessage += ` [${service}]`;
        }

        logMessage += `: ${message}`;

        // Add metadata if present
        if (Object.keys(meta).length > 0) {
            logMessage += ` ${JSON.stringify(meta)}`;
        }

        return logMessage;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: 'crossbeg-relayer' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: fileFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: fileFormat,
            maxsize: 10485760, // 10MB
            maxFiles: 5,
        }),

        // Console output
        new winston.transports.Console({
            format: consoleFormat
        })
    ],

    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: fileFormat
        })
    ],

    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: fileFormat
        })
    ]
});

// Add request logging middleware helper
logger.requestMiddleware = (req, res, next) => {
    const start = Date.now();

    // Log request
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        query: req.query,
        body: req.method === 'POST' ? req.body : undefined
    });

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
            duration: `${duration}ms`,
            statusCode: res.statusCode
        });
    });

    next();
};

// Add performance timing helper
logger.time = (label) => {
    const startTime = Date.now();

    return {
        end: (message = '') => {
            const duration = Date.now() - startTime;
            logger.info(`⏱️ ${label} ${message}`, { duration: `${duration}ms` });
            return duration;
        }
    };
};

// Add structured logging methods
logger.chain = (chainKey, message, meta = {}) => {
    logger.info(message, { chainKey, ...meta });
};

logger.relay = (requestId, message, meta = {}) => {
    logger.info(message, { requestId, ...meta });
};

logger.api = (endpoint, message, meta = {}) => {
    logger.info(message, { endpoint, ...meta });
};

logger.blockchain = (chainKey, message, meta = {}) => {
    logger.info(message, { chainKey, type: 'blockchain', ...meta });
};

logger.event = (eventType, message, meta = {}) => {
    logger.info(message, { eventType, type: 'event', ...meta });
};

// Add error helpers
logger.errorWithStack = (message, error, meta = {}) => {
    logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...meta
    });
};

logger.criticalError = (message, error, meta = {}) => {
    logger.error(`🚨 CRITICAL: ${message}`, {
        error: error.message,
        stack: error.stack,
        ...meta
    });
};

// Add success/failure helpers
logger.success = (message, meta = {}) => {
    logger.info(`✅ ${message}`, meta);
};

logger.failure = (message, meta = {}) => {
    logger.error(`❌ ${message}`, meta);
};

logger.warning = (message, meta = {}) => {
    logger.warn(`⚠️ ${message}`, meta);
};

// Add startup/shutdown helpers
logger.startup = (message, meta = {}) => {
    logger.info(`🚀 ${message}`, { type: 'startup', ...meta });
};

logger.shutdown = (message, meta = {}) => {
    logger.info(`🛑 ${message}`, { type: 'shutdown', ...meta });
};

// Add health check helper
logger.health = (status, message, meta = {}) => {
    const emoji = status === 'healthy' ? '💚' : '💔';
    logger.info(`${emoji} Health: ${message}`, { status, type: 'health', ...meta });
};

// Add metrics helper
logger.metrics = (metric, value, meta = {}) => {
    logger.info(`📊 ${metric}: ${value}`, { metric, value, type: 'metrics', ...meta });
};

// Production mode adjustments
if (process.env.NODE_ENV === 'production') {
    // Reduce console verbosity in production
    logger.transports.forEach(transport => {
        if (transport instanceof winston.transports.Console) {
            transport.level = 'warn';
        }
    });

    // Add additional file transport for audit logs
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'audit.log'),
        level: 'info',
        format: fileFormat,
        maxsize: 20971520, // 20MB
        maxFiles: 10,
    }));
}

// Development mode adjustments
if (process.env.NODE_ENV === 'development') {
    // More verbose logging in development
    logger.level = 'debug';

    // Add debug file transport
    logger.add(new winston.transports.File({
        filename: path.join(logsDir, 'debug.log'),
        level: 'debug',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 3,
    }));
}

// Log startup message
logger.startup('Logger initialized', {
    level: logger.level,
    environment: process.env.NODE_ENV || 'development',
    logsDirectory: logsDir
});

module.exports = logger; 