export const CROSSBEG_ABI = [
  "event PaymentRequestCreated(uint256 indexed requestId, address indexed requester, address indexed target, uint256 amount, string token, uint32 targetChain, string message, uint256 timestamp, uint256 expiryTime)",
  "event PaymentRequestReceived(uint256 indexed requestId, address indexed requester, address indexed target, uint256 amount, string token, uint32 originChain, string message, uint256 timestamp, uint256 expiryTime, uint8 status)",
  "event PaymentRequestFulfilled(uint256 indexed requestId, address indexed payer, uint256 amount, string token, string txHash)",
  "event PaymentRequestCancelled(uint256 indexed requestId, address indexed requester)",
  "event CrossChainMessageSent(uint256 indexed requestId, address indexed requester, address indexed target, uint32 targetChain, uint256 amount, string token, string message, uint256 expiryTime, bytes32 messageHash)",
  "event CrossChainMessageDelivered(uint256 indexed requestId, uint32 originChain, bytes32 messageHash, uint8 status)",
  
  "function createPaymentRequest(address target, uint256 amount, string memory token, uint32 targetChain, string memory message, uint256 expiryTime) external returns (uint256)",
  "function fulfillPaymentRequest(uint256 requestId, string memory txHash) external",
  "function cancelPaymentRequest(uint256 requestId) external",
  "function getPaymentRequest(uint256 requestId) external view returns (tuple(uint256 id, address requester, address target, uint256 amount, string token, uint32 originChain, uint32 targetChain, string message, uint8 status, uint8 messageStatus, uint256 timestamp, uint256 expiryTime, string fulfillmentTxHash, bytes32 messageHash))",
  "function getUserSentRequests(address user) external view returns (uint256[] memory)",
  "function getUserReceivedRequests(address user) external view returns (uint256[] memory)",
  "function getPaymentRequests(uint256[] calldata requestIds) external view returns (tuple(uint256 id, address requester, address target, uint256 amount, string token, uint32 originChain, uint32 targetChain, string message, uint8 status, uint8 messageStatus, uint256 timestamp, uint256 expiryTime, string fulfillmentTxHash, bytes32 messageHash)[] memory)",
] as const;

export enum RequestStatus {
  Pending = 0,
  Fulfilled = 1,
  Cancelled = 2,
  Expired = 3,
}

export enum MessageStatus {
  Local = 0,
  Sent = 1,
  Delivered = 2,
  Failed = 3,
}

export interface PaymentRequest {
  id: string;
  requester: string;
  target: string;
  amount: string;
  token: string;
  originChain: number;
  targetChain: number;
  message: string;
  status: RequestStatus;
  messageStatus: MessageStatus;
  timestamp: number;
  expiryTime: number;
  fulfillmentTxHash: string;
  messageHash: string;
}

export interface CreatePaymentRequestParams {
  target: string;
  amount: string;
  token: string;
  targetChain: number;
  message: string;
  expiryTime?: number;
}

export const DEFAULT_EXPIRY_TIME = 7 * 24 * 60 * 60; // 7 days in seconds
export const MIN_EXPIRY_TIME = 60 * 60; // 1 hour in seconds
export const MAX_EXPIRY_TIME = 30 * 24 * 60 * 60; // 30 days in seconds 