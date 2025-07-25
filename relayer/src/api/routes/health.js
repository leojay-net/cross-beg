/**
 * Health Check Routes
 * Provides system health and status endpoints
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');

/**
 * Setup health routes
 * @param {Object} relayer - Main relayer instance
 * @returns {express.Router} Configured router
 */
function setupHealthRoutes(relayer) {
  
  // Basic health check
  router.get('/', async (req, res) => {
    try {
      const stats = relayer.getStats();
      const status = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: stats.uptime,
        version: process.env.npm_package_version || '1.0.0'
      };
      
      logger.health('healthy', 'Health check passed', { endpoint: '/health' });
      res.json(status);
    } catch (error) {
      logger.health('unhealthy', 'Health check failed', { 
        endpoint: '/health',
        error: error.message 
      });
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Detailed health check
  router.get('/detailed', async (req, res) => {
    try {
      const stats = relayer.getStats();
      const balances = await relayer.getWalletBalances();
      const chainStatus = relayer.getChainStatus();
      const queueStatus = relayer.getQueueStatus();
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: stats.uptime,
        version: process.env.npm_package_version || '1.0.0',
        stats,
        walletBalances: balances,
        chainStatus,
        queueStatus,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          memory: process.memoryUsage(),
          pid: process.pid
        }
      };
      
      logger.health('healthy', 'Detailed health check passed', { 
        endpoint: '/health/detailed' 
      });
      res.json(healthData);
    } catch (error) {
      logger.health('unhealthy', 'Detailed health check failed', { 
        endpoint: '/health/detailed',
        error: error.message 
      });
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Readiness check
  router.get('/ready', async (req, res) => {
    try {
      const isReady = relayer.isReady();
      
      if (isReady) {
        logger.health('ready', 'Readiness check passed', { endpoint: '/health/ready' });
        res.json({ 
          status: 'ready',
          timestamp: new Date().toISOString()
        });
      } else {
        logger.health('not-ready', 'Readiness check failed', { endpoint: '/health/ready' });
        res.status(503).json({ 
          status: 'not-ready',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.health('error', 'Readiness check error', { 
        endpoint: '/health/ready',
        error: error.message 
      });
      res.status(500).json({ 
        status: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Liveness check
  router.get('/live', (req, res) => {
    logger.health('alive', 'Liveness check passed', { endpoint: '/health/live' });
    res.json({ 
      status: 'alive',
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptime: process.uptime()
    });
  });

  return router;
}

module.exports = setupHealthRoutes; 