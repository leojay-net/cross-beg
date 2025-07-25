/**
 * API Routes Index
 * Consolidates all API route modules
 */

const setupHealthRoutes = require('./health');
const setupMessageRoutes = require('./messages');
const setupAdminRoutes = require('./admin');
const logger = require('../../utils/logger');

/**
 * Setup all API routes
 * @param {express.Application} app - Express app
 * @param {CrossBegRelayer} relayer - Relayer instance
 */
function setupApiRoutes(app, relayer) {
    // Health check routes
    app.use('/health', setupHealthRoutes(relayer));

    // Message-related routes
    app.use('/messages', setupMessageRoutes(relayer));

    // Admin routes
    app.use('/admin', setupAdminRoutes(relayer));

    // Root endpoint
    app.get('/', (req, res) => {
        const stats = relayer.getStats();
        res.json({
            service: 'CrossBeg Relayer',
            version: process.env.npm_package_version || '1.0.0',
            status: 'running',
            uptime: stats.uptime,
            timestamp: new Date().toISOString(),
            features: {
                crossChainMessaging: true,
                realTimeUpdates: true,
                webSocketSupport: true
            },
            endpoints: {
                health: '/health',
                messages: '/messages',
                admin: '/admin',
                websocket: 'ws://localhost:' + (process.env.PORT || 3001)
            }
        });
    });

    logger.info('✅ API routes configured');
}

module.exports = setupApiRoutes; 