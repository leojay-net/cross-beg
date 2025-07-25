/**
 * CrossBeg Relayer Entry Point
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const CrossBegRelayer = require('./CrossBegRelayer');
const setupApiRoutes = require('./api/routes');
const logger = require('./utils/logger');

// Load environment variables
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3001;

// Initialize relayer
const relayer = new CrossBegRelayer();

// Middleware
app.use(cors());
app.use(express.json());

// Setup API routes
setupApiRoutes(app, relayer);

// WebSocket connection handling with session management
wss.on('connection', (ws, req) => {
    logger.info('📡 New WebSocket connection established', {
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
    });

    let sessionId = null;

    // Send initial connection message
    ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: Date.now(),
        message: 'Connected to CrossBeg Relayer WebSocket'
    }));

    // Handle client messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleWebSocketMessage(ws, data);
        } catch (error) {
            logger.error('❌ Error parsing WebSocket message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message format'
            }));
        }
    });

    ws.on('close', () => {
        if (sessionId && relayer.sessionManager) {
            relayer.sessionManager.deleteSession(sessionId);
        }
        logger.info('📡 WebSocket connection closed', {
            sessionId: sessionId ? sessionId.substring(0, 8) + '...' : 'unknown'
        });
    });

    ws.on('error', (error) => {
        logger.error('❌ WebSocket error:', error);
    });

    /**
     * Handle incoming WebSocket messages with session management
     * @param {WebSocket} ws - WebSocket connection
     * @param {Object} data - Message data
     */
    function handleWebSocketMessage(ws, data) {
        switch (data.type) {
            case 'create_session':
                // Create user session
                if (data.userAddress && relayer.sessionManager) {
                    sessionId = relayer.sessionManager.createSession(
                        data.userAddress,
                        data.chainId || null,
                        ws
                    );
                    
                    if (sessionId) {
                        ws.send(JSON.stringify({
                            type: 'session_created',
                            sessionId,
                            userAddress: data.userAddress,
                            chainId: data.chainId,
                            timestamp: Date.now()
                        }));
                        
                        logger.debug('👤 Created session for WebSocket', {
                            sessionId: sessionId.substring(0, 8) + '...',
                            userAddress: data.userAddress
                        });
                    } else {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: 'Failed to create session'
                        }));
                    }
                }
                break;

            case 'subscribe_user':
                // Subscribe to updates for a specific user
                if (sessionId && data.userAddress && relayer.sessionManager) {
                    relayer.sessionManager.addSubscription(sessionId, 'user_updates', {
                        userAddress: data.userAddress
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'subscription_confirmed',
                        subscriptionType: 'user_updates',
                        userAddress: data.userAddress,
                        timestamp: Date.now()
                    }));
                    
                    logger.debug('📡 User subscribed to updates', {
                        sessionId: sessionId.substring(0, 8) + '...',
                        userAddress: data.userAddress
                    });
                }
                break;

            case 'subscribe_chain':
                // Subscribe to updates for a specific chain
                if (sessionId && data.chainId && relayer.sessionManager) {
                    relayer.sessionManager.addSubscription(sessionId, 'chain_updates', {
                        chainId: data.chainId
                    });
                    
                    ws.send(JSON.stringify({
                        type: 'chain_subscription_confirmed',
                        chainId: data.chainId,
                        timestamp: Date.now()
                    }));
                    
                    logger.debug('📡 Chain subscription confirmed', {
                        sessionId: sessionId.substring(0, 8) + '...',
                        chainId: data.chainId
                    });
                }
                break;

            case 'get_status':
                // Send current relayer status
                ws.send(JSON.stringify({
                    type: 'status_update',
                    status: relayer.getStats(),
                    timestamp: Date.now()
                }));
                break;

            case 'get_user_messages':
                // Get messages for user
                if (data.userAddress) {
                    const messages = relayer.getMessagesByUser(data.userAddress, data.options || {});
                    ws.send(JSON.stringify({
                        type: 'user_messages',
                        userAddress: data.userAddress,
                        messages: messages,
                        timestamp: Date.now()
                    }));
                }
                break;

            case 'ping':
                // Update session activity and respond with pong
                if (sessionId && relayer.sessionManager) {
                    relayer.sessionManager.updateActivity(sessionId, ws);
                }
                ws.send(JSON.stringify({
                    type: 'pong',
                    timestamp: Date.now()
                }));
                break;

            default:
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Unknown message type'
                }));
        }
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.shutdown('Received SIGINT, shutting down gracefully...');
    
    // Close WebSocket server
    wss.close(() => {
        logger.shutdown('WebSocket server closed');
    });
    
    // Shutdown relayer
    await relayer.shutdown();
    
    // Close HTTP server
    server.close(() => {
        logger.shutdown('HTTP server closed');
        process.exit(0);
    });
});

process.on('SIGTERM', async () => {
    logger.shutdown('Received SIGTERM, shutting down gracefully...');
    await relayer.shutdown();
    server.close(() => {
        process.exit(0);
    });
});

// Start the relayer and server
async function start() {
    try {
        // Initialize relayer
        await relayer.initialize();
        
        // Start server
        server.listen(PORT, () => {
            logger.startup(`🚀 CrossBeg Relayer started on port ${PORT}`, {
                port: PORT,
                websocket: true,
                timestamp: new Date().toISOString()
            });
        });
        
    } catch (error) {
        logger.criticalError('Failed to start CrossBeg Relayer', error);
        process.exit(1);
    }
}

start(); 