/**
 * Admin Routes
 * Provides administrative endpoints for system management
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * Setup admin routes
 * @param {Object} relayer - Main relayer instance
 * @returns {express.Router} Configured router
 */
function setupAdminRoutes(relayer) {

    // Get comprehensive system stats
    router.get('/stats', async (req, res) => {
        try {
            const stats = relayer.getStats();
            const balances = await relayer.getWalletBalances();
            const chainStatus = relayer.getChainStatus();
            const queueStatus = relayer.getQueueStatus();

            const adminStats = {
                ...stats,
                walletBalances: balances,
                chainStatus,
                queueStatus,
                timestamp: new Date().toISOString()
            };

            logger.api('/admin/stats', 'Retrieved comprehensive system stats');
            res.json(adminStats);

        } catch (error) {
            logger.errorWithStack('Admin stats endpoint error', error, {
                endpoint: '/admin/stats'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get supported chains
    router.get('/chains', (req, res) => {
        try {
            const chainStatus = relayer.getChainStatus();
            const chains = Object.entries(chainStatus).map(([key, status]) => ({
                key,
                ...status
            }));

            logger.api('/admin/chains', `Retrieved ${chains.length} chain configurations`);
            res.json({ chains });

        } catch (error) {
            logger.errorWithStack('Chains endpoint error', error, {
                endpoint: '/admin/chains'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get wallet balances
    router.get('/wallets', async (req, res) => {
        try {
            const balances = await relayer.getWalletBalances();

            logger.api('/admin/wallets', 'Retrieved wallet balances', {
                walletsCount: Object.keys(balances).length
            });

            res.json({ wallets: balances });

        } catch (error) {
            logger.errorWithStack('Wallets endpoint error', error, {
                endpoint: '/admin/wallets'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get queue status
    router.get('/queue', (req, res) => {
        try {
            const queueStatus = relayer.getQueueStatus();

            logger.api('/admin/queue', 'Retrieved queue status', {
                queueSize: queueStatus.currentQueueSize,
                retryQueueSize: queueStatus.currentRetryQueueSize
            });

            res.json(queueStatus);

        } catch (error) {
            logger.errorWithStack('Queue endpoint error', error, {
                endpoint: '/admin/queue'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get detailed queue contents (for debugging)
    router.get('/queue/details', (req, res) => {
        try {
            const { limit = 10 } = req.query;
            const queueDetails = relayer.getQueueDetails(parseInt(limit));

            logger.api('/admin/queue/details', 'Retrieved queue details', {
                limit: parseInt(limit)
            });

            res.json(queueDetails);

        } catch (error) {
            logger.errorWithStack('Queue details endpoint error', error, {
                endpoint: '/admin/queue/details'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get analytics data
    router.get('/analytics', (req, res) => {
        try {
            const { timeRange = '24h' } = req.query;
            const analytics = relayer.getAnalytics(timeRange);

            logger.api('/admin/analytics', `Retrieved analytics for ${timeRange}`, {
                timeRange,
                totalRequests: analytics.totalRequests
            });

            res.json(analytics);

        } catch (error) {
            logger.errorWithStack('Analytics endpoint error', error, {
                endpoint: '/admin/analytics',
                timeRange: req.query.timeRange
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Refresh chain connection
    router.post('/chains/:chainKey/refresh', async (req, res) => {
        try {
            const { chainKey } = req.params;
            await relayer.refreshChain(chainKey);

            logger.success(`Chain refreshed`, { chainKey });
            res.json({
                success: true,
                message: `Chain ${chainKey} refreshed successfully`
            });

        } catch (error) {
            logger.errorWithStack('Chain refresh endpoint error', error, {
                endpoint: '/admin/chains/refresh',
                chainKey: req.params.chainKey
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Clear message queues (dangerous - for debugging only)
    router.post('/queue/clear', (req, res) => {
        try {
            const { confirm } = req.body;

            if (confirm !== 'CLEAR_QUEUES') {
                return res.status(400).json({
                    error: 'Confirmation required. Send { "confirm": "CLEAR_QUEUES" }'
                });
            }

            relayer.clearQueues();

            logger.warning('Message queues cleared by admin request');
            res.json({
                success: true,
                message: 'All message queues cleared'
            });

        } catch (error) {
            logger.errorWithStack('Queue clear endpoint error', error, {
                endpoint: '/admin/queue/clear'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get network information for a chain
    router.get('/chains/:chainKey/network', async (req, res) => {
        try {
            const { chainKey } = req.params;
            const networkInfo = await relayer.getNetworkInfo(chainKey);

            logger.api('/admin/chains/network', `Retrieved network info for ${chainKey}`, {
                chainKey,
                blockNumber: networkInfo.blockNumber
            });

            res.json(networkInfo);

        } catch (error) {
            logger.errorWithStack('Network info endpoint error', error, {
                endpoint: '/admin/chains/network',
                chainKey: req.params.chainKey
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Estimate relay cost
    router.post('/relay/estimate', async (req, res) => {
        try {
            const messageData = req.body;
            const estimation = await relayer.estimateRelayCost(messageData);

            logger.api('/admin/relay/estimate', 'Generated relay cost estimation', {
                targetChain: estimation.chainId,
                estimatedCostEth: estimation.estimatedCostEth
            });

            res.json(estimation);

        } catch (error) {
            logger.errorWithStack('Relay estimation endpoint error', error, {
                endpoint: '/admin/relay/estimate'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Get system metrics
    router.get('/metrics', (req, res) => {
        try {
            const metrics = {
                process: {
                    pid: process.pid,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    version: process.version,
                    platform: process.platform,
                    arch: process.arch
                },
                relayer: relayer.getStats(),
                timestamp: new Date().toISOString()
            };

            logger.metrics('system_metrics', 'Retrieved system metrics');
            res.json(metrics);

        } catch (error) {
            logger.errorWithStack('Metrics endpoint error', error, {
                endpoint: '/admin/metrics'
            });
            res.status(500).json({ error: error.message });
        }
    });

    // Restart event listeners for a chain
    router.post('/chains/:chainKey/listeners/restart', (req, res) => {
        try {
            const { chainKey } = req.params;
            relayer.restartChainListeners(chainKey);

            logger.success(`Event listeners restarted`, { chainKey });
            res.json({
                success: true,
                message: `Event listeners restarted for ${chainKey}`
            });

        } catch (error) {
            logger.errorWithStack('Listeners restart endpoint error', error, {
                endpoint: '/admin/chains/listeners/restart',
                chainKey: req.params.chainKey
            });
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}

module.exports = setupAdminRoutes; 