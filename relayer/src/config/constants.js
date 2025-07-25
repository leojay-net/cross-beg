/**
 * Constants Configuration Module
 * Defines contract ABI, enums, and other constants
 */

// Enhanced Contract ABI
const CONTRACT_ABI = [
  "event CrossChainMessageSent(uint256 indexed requestId, address indexed requester, address indexed target, uint32 targetChain, uint256 amount, string token, string message, uint256 expiryTime, bytes32 messageHash)",
  "event PaymentRequestReceived(uint256 indexed requestId, address indexed requester, address indexed target, uint256 amount, string token, uint32 originChain, string message, uint256 timestamp, uint256 expiryTime, uint8 status)",
  "event PaymentRequestFulfilled(uint256 indexed requestId, address indexed payer, uint256 amount, string token, string txHash)",
  "event PaymentRequestCancelled(uint256 indexed requestId, address indexed requester)",
  "event MessageStatusUpdated(uint256 indexed requestId, uint8 oldStatus, uint8 newStatus)",
  "event CrossChainMessageDelivered(uint256 indexed requestId, uint32 originChain, bytes32 messageHash, uint8 status)",
  "function receiveMessage(uint256 requestId, address requester, address target, uint256 amount, string memory token, uint32 originChain, string memory message, uint256 timestamp, uint256 expiryTime, bytes32 messageHash) external",
  "function updateMessageStatus(uint256 requestId, uint8 newStatus) external",
  "function getPaymentRequest(uint256 requestId) external view returns (tuple(uint256 id, address requester, address target, uint256 amount, string token, uint32 originChain, uint32 targetChain, string message, uint8 status, uint8 messageStatus, uint256 timestamp, uint256 expiryTime, string fulfillmentTxHash, bytes32 messageHash))"
];

// Message status enum
const MessageStatus = {
  Local: 0,
  Sent: 1,
  Delivered: 2,
  Failed: 3
};

// Request status enum
const RequestStatus = {
  Pending: 0,
  Fulfilled: 1,
  Cancelled: 2,
  Expired: 3
};

// Default configuration values
const DEFAULT_CONFIG = {
  PORT: 3000,
  LOG_LEVEL: 'info',
  RATE_LIMIT_MAX: 100,
  RATE_LIMIT_WINDOW: 900, // 15 minutes
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  INDEXER_INTERVAL: 30000, // 30 seconds
  INDEXER_BATCH_SIZE: 500, // Reduced from 1000 to be more conservative
  HISTORICAL_BLOCKS_LIMIT: 10000,
  MESSAGE_PROCESSING_INTERVAL: 3000, // 3 seconds
  RETRY_CHECK_INTERVAL: 10000, // 10 seconds
  MIN_WALLET_BALANCE: 0.01 // ETH
};

// Event types for indexing
const EVENT_TYPES = {
  SENT: 'sent',
  RECEIVED: 'received',
  FULFILLED: 'fulfilled',
  CANCELLED: 'cancelled',
  STATUS_UPDATED: 'status_updated',
  DELIVERED: 'delivered'
};

// API response formats
const RESPONSE_FORMATS = {
  JSON: 'json',
  CSV: 'csv'
};

// Time ranges for analytics
const TIME_RANGES = {
  HOUR: '1h',
  DAY: '24h',
  WEEK: '7d',
  MONTH: '30d'
};

// Status messages
const STATUS_MESSAGES = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

module.exports = {
  CONTRACT_ABI,
  MessageStatus,
  RequestStatus,
  DEFAULT_CONFIG,
  EVENT_TYPES,
  RESPONSE_FORMATS,
  TIME_RANGES,
  STATUS_MESSAGES
}; 