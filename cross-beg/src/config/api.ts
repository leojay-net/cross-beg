/**
 * API Configuration for CrossBeg Frontend
 */

// Environment-based configuration
const isDevelopment = import.meta.env.MODE === 'development';

// API Base URLs
export const API_CONFIG = {
    // Relayer Service
    RELAYER_BASE_URL: isDevelopment
        ? 'http://localhost:3000'
        : process.env.VITE_RELAYER_URL || 'http://localhost:3000',

    // WebSocket URL for real-time updates
    RELAYER_WS_URL: isDevelopment
        ? 'ws://localhost:3000'
        : process.env.VITE_RELAYER_WS_URL || 'ws://localhost:3000',

    // Li.Fi Service (already using their public API)
    LIFI_BASE_URL: 'https://li.quest/v1',

    // Request timeout (ms)
    REQUEST_TIMEOUT: 30000,

    // WebSocket reconnection settings
    WS_RECONNECT_INTERVAL: 5000,
    WS_MAX_RECONNECT_ATTEMPTS: 5,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
    // Relayer endpoints
    RELAYER: {
        HEALTH: '/health',
        MESSAGES: '/messages',
        MESSAGE_BY_ID: (id: string) => `/messages/${id}`,
        WEBSOCKET: '/',
    },

    // Li.Fi endpoints (used in lifiService.ts)
    LIFI: {
        QUOTE: '/quote',
        STATUS: '/status',
    },
} as const;

// Export individual URLs for backward compatibility
export const RELAYER_BASE_URL = API_CONFIG.RELAYER_BASE_URL;
export const RELAYER_WS_URL = API_CONFIG.RELAYER_WS_URL;
export const LIFI_BASE_URL = API_CONFIG.LIFI_BASE_URL;
