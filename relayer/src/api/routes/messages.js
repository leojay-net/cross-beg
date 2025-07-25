/**
 * Message Routes
 * Handles message-related API endpoints
 */

const express = require('express');
const { ethers } = require('ethers');
const router = express.Router();
const logger = require('../../utils/logger');
const { RESPONSE_FORMATS } = require('../../config/constants');

/**
 * Setup message routes
 * @param {Object} relayer - Main relayer instance
 * @returns {express.Router} Configured router
 */
function setupMessageRoutes(relayer) {

  // Get messages for a user (cross-chain aggregated)
  router.get('/user/:userAddress', async (req, res) => {
    try {
      const { userAddress } = req.params;
      const {
        limit = 50,
        offset = 0,
        status,
        chainKey,
        includeAllChains = 'true',
        crossChainOnly = 'false'
      } = req.query;

      if (!ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: 'Invalid address format' });
      }

      const result = relayer.getMessagesByUser(userAddress, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status,
        chainKey,
        includeAllChains: includeAllChains === 'true'
      });

      // Filter for cross-chain only if requested
      if (crossChainOnly === 'true') {
        result.messages = result.messages.filter(msg =>
          msg.summary.crossChainContext?.isCrossChain
        );
        result.total = result.messages.length;
      }

      logger.api('/messages/user', `Retrieved ${result.messages.length} messages`, {
        userAddress,
        total: result.total,
        crossChainRequests: result.crossChainSummary?.crossChainRequests || 0,
        localRequests: result.crossChainSummary?.localRequests || 0
      });

      res.json(result);

    } catch (error) {
      logger.errorWithStack('Messages endpoint error', error, {
        endpoint: '/messages/user',
        userAddress: req.params.userAddress
      });
      res.status(500).json({ error: error.message });
    }
  });

    // Get pending requests for a user (cross-chain aware)
  router.get('/pending/:userAddress', async (req, res) => {
    try {
      const { userAddress } = req.params;
      const { 
        limit = 50, 
        offset = 0,
        userConnectedChainId
      } = req.query;
      
      if (!ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: 'Invalid address format' });
      }
      
      const result = relayer.getPendingRequests(userAddress, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // Add context about which chain the user is currently connected to
      if (userConnectedChainId) {
        result.userContext = {
          connectedChainId: parseInt(userConnectedChainId),
          connectedChainName: Object.values(relayer.providerManager.getAllChains())
            .find(chain => chain.chainId === parseInt(userConnectedChainId))?.name || 'Unknown',
          crossChainPendingCount: result.messages.filter(msg => 
            msg.summary.crossChainContext?.isCrossChain && 
            msg.summary.crossChainContext?.targetChainKey !== userConnectedChainId
          ).length
        };
      }
      
      logger.api('/messages/pending', `Retrieved ${result.messages.length} pending requests`, {
        userAddress,
        total: result.total,
        userConnectedChain: result.userContext?.connectedChainName
      });
      
      res.json(result);
      
    } catch (error) {
      logger.errorWithStack('Pending requests endpoint error', error, {
        endpoint: '/messages/pending',
        userAddress: req.params.userAddress
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get cross-chain message discovery for a user
  router.get('/cross-chain/:userAddress', async (req, res) => {
    try {
      const { userAddress } = req.params;
      const { 
        userConnectedChainId,
        limit = 50,
        offset = 0
      } = req.query;
      
      if (!ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: 'Invalid address format' });
      }

      // Get all messages for the user
      const allMessages = relayer.getMessagesByUser(userAddress, {
        limit: 1000, // Get more to analyze cross-chain patterns
        offset: 0,
        includeAllChains: true
      });

      // Categorize messages based on user's current chain
      const connectedChainId = userConnectedChainId ? parseInt(userConnectedChainId) : null;
      const categorizedMessages = {
        onCurrentChain: [],
        fromOtherChains: [],
        toOtherChains: [],
        crossChainOnly: []
      };

      for (const message of allMessages.messages) {
        const context = message.summary.crossChainContext;
        
        if (context.isCrossChain) {
          categorizedMessages.crossChainOnly.push(message);
          
          // Check if message involves user's current chain
          if (connectedChainId) {
            const connectedChainKey = Object.keys(relayer.providerManager.getAllChains())
              .find(key => relayer.providerManager.getAllChains()[key].chainId === connectedChainId);
            
            if (context.originChainKey === connectedChainKey) {
              categorizedMessages.toOtherChains.push(message);
            } else if (context.targetChainKey === connectedChainKey) {
              categorizedMessages.fromOtherChains.push(message);
            }
          }
        } else {
          categorizedMessages.onCurrentChain.push(message);
        }
      }

      // Apply pagination to the relevant category
      const relevantMessages = connectedChainId ? 
        [...categorizedMessages.fromOtherChains, ...categorizedMessages.toOtherChains] :
        categorizedMessages.crossChainOnly;

      const paginatedMessages = relevantMessages
        .sort((a, b) => b.lastUpdate - a.lastUpdate)
        .slice(offset, offset + limit);

      const result = {
        messages: paginatedMessages,
        total: relevantMessages.length,
        hasMore: offset + limit < relevantMessages.length,
        crossChainSummary: allMessages.crossChainSummary,
        categorization: {
          onCurrentChain: categorizedMessages.onCurrentChain.length,
          fromOtherChains: categorizedMessages.fromOtherChains.length,
          toOtherChains: categorizedMessages.toOtherChains.length,
          totalCrossChain: categorizedMessages.crossChainOnly.length
        },
        userContext: connectedChainId ? {
          connectedChainId,
          connectedChainName: Object.values(relayer.providerManager.getAllChains())
            .find(chain => chain.chainId === connectedChainId)?.name || 'Unknown'
        } : null
      };
      
      logger.api('/messages/cross-chain', `Retrieved ${result.messages.length} cross-chain messages`, {
        userAddress,
        total: result.total,
        connectedChain: result.userContext?.connectedChainName
      });
      
      res.json(result);
      
    } catch (error) {
      logger.errorWithStack('Cross-chain discovery endpoint error', error, {
        endpoint: '/messages/cross-chain',
        userAddress: req.params.userAddress
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get request history by ID
  router.get('/request/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const history = relayer.getRequestHistory(requestId);

      if (!history) {
        return res.status(404).json({ error: 'Request not found' });
      }

      logger.api('/messages/request', `Retrieved request history`, {
        requestId,
        eventsCount: history.events.length
      });

      res.json(history);

    } catch (error) {
      logger.errorWithStack('Request history endpoint error', error, {
        endpoint: '/messages/request',
        requestId: req.params.requestId
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Search messages across all chains
  router.get('/search', async (req, res) => {
    try {
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
      } = req.query;

      const result = relayer.searchMessages({
        requester,
        target,
        token,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        status,
        chainKey,
        fromDate: fromDate ? new Date(fromDate).getTime() : undefined,
        toDate: toDate ? new Date(toDate).getTime() : undefined,
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      logger.api('/messages/search', `Search returned ${result.messages.length} results`, {
        total: result.total,
        filters: { requester, target, token, status, chainKey }
      });

      res.json(result);

    } catch (error) {
      logger.errorWithStack('Search endpoint error', error, {
        endpoint: '/messages/search',
        query: req.query
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Export user data
  router.get('/export/:userAddress', async (req, res) => {
    try {
      const { userAddress } = req.params;
      const { format = RESPONSE_FORMATS.JSON } = req.query;

      if (!ethers.isAddress(userAddress)) {
        return res.status(400).json({ error: 'Invalid address format' });
      }

      const result = relayer.getMessagesByUser(userAddress, { limit: 1000 });

      if (format === RESPONSE_FORMATS.CSV) {
        const csv = result.messages.map(msg => {
          const summary = msg.summary;
          return {
            requestId: msg.requestId,
            status: summary.status,
            requester: summary.requester,
            target: summary.target,
            amount: summary.amount,
            token: summary.token,
            message: summary.message,
            originChain: summary.originChain,
            targetChain: summary.targetChain,
            createdAt: summary.createdAt ? new Date(summary.createdAt).toISOString() : null,
            fulfilledAt: summary.fulfilledAt ? new Date(summary.fulfilledAt).toISOString() : null,
            expiryTime: summary.expiryTime ? new Date(summary.expiryTime).toISOString() : null
          };
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="crossbeg-${userAddress}.csv"`);

        // Simple CSV conversion
        const headers = Object.keys(csv[0] || {});
        const csvContent = [
          headers.join(','),
          ...csv.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
        ].join('\n');

        logger.api('/messages/export', `Exported ${csv.length} messages as CSV`, {
          userAddress,
          format
        });

        res.send(csvContent);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="crossbeg-${userAddress}.json"`);

        logger.api('/messages/export', `Exported ${result.messages.length} messages as JSON`, {
          userAddress,
          format
        });

        res.json(result);
      }

    } catch (error) {
      logger.errorWithStack('Export endpoint error', error, {
        endpoint: '/messages/export',
        userAddress: req.params.userAddress
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Manual relay endpoint (for debugging/admin)
  router.post('/relay/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;
      const success = await relayer.manualRelay(requestId);

      if (success) {
        logger.success(`Manual relay completed`, { requestId });
        res.json({ success: true, message: 'Message relayed successfully' });
      } else {
        logger.failure(`Manual relay failed`, { requestId });
        res.status(500).json({ success: false, message: 'Failed to relay message' });
      }

    } catch (error) {
      logger.errorWithStack('Manual relay endpoint error', error, {
        endpoint: '/messages/relay',
        requestId: req.params.requestId
      });
      res.status(500).json({ error: error.message });
    }
  });

  // Get message statistics
  router.get('/stats', async (req, res) => {
    try {
      const stats = relayer.getMessageStats();

      logger.api('/messages/stats', 'Retrieved message statistics', {
        totalMessages: stats.totalMessages
      });

      res.json(stats);

    } catch (error) {
      logger.errorWithStack('Message stats endpoint error', error, {
        endpoint: '/messages/stats'
      });
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = setupMessageRoutes; 