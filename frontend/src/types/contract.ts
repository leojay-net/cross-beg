// Core contract types
export interface PaymentRequest {
  id: bigint;
  requester: string;
  target: string;
  amount: bigint;
  token: string;
  originChain: number;
  targetChain: number;
  message: string;
  status: RequestStatus;
  timestamp: bigint;
  expiryTime: bigint;
  fulfillmentTxHash: string;
}

export enum RequestStatus {
  Pending = 0,
  Fulfilled = 1,
  Cancelled = 2,
  Expired = 3,
}

export interface CrossBegContractEvents {
  PaymentRequestCreated: {
    requestId: bigint;
    requester: string;
    target: string;
    amount: bigint;
    token: string;
    targetChain: number;
    message: string;
    timestamp: bigint;
  };
  PaymentRequestReceived: {
    requestId: bigint;
    requester: string;
    target: string;
    amount: bigint;
    token: string;
    originChain: number;
    message: string;
    timestamp: bigint;
  };
  PaymentRequestFulfilled: {
    requestId: bigint;
    payer: string;
    amount: bigint;
    token: string;
    txHash: string;
  };
  PaymentRequestCancelled: {
    requestId: bigint;
    requester: string;
  };
  CrossChainMessageSent: {
    requestId: bigint;
    destinationChain: number;
    messageId: string;
  };
}

export interface ContractStats {
  totalRequests: bigint;
  currentRequestId: bigint;
}
