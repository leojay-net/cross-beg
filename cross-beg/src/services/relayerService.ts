import { PaymentRequest } from '@/config/contracts';
import { API_CONFIG, API_ENDPOINTS } from '@/config/api';

export interface RelayerMessage {
  requestId: string;
  summary: {
    status: string;
    requester: string;
    target: string;
    amount: string;
    token: string;
    message: string;
    originChain: string;
    targetChain: string;
    createdAt: number;
    fulfilledAt?: number;
    expiryTime: number;
    crossChainContext: {
      isCrossChain: boolean;
      originChainKey: string;
      targetChainKey: string;
    };
  };
  events: Array<{
    type: string;
    timestamp: number;
    data: any;
  }>;
  lastUpdate: number;
}

export interface RelayerResponse {
  messages: RelayerMessage[];
  total: number;
  hasMore: boolean;
  crossChainSummary?: {
    crossChainRequests: number;
    localRequests: number;
    totalChains: number;
  };
}

export interface PendingRequestsResponse extends RelayerResponse {
  userContext?: {
    connectedChainId: number;
    connectedChainName: string;
    crossChainPendingCount: number;
  };
}

export class RelayerService {
  private baseUrl: string;

  constructor(baseUrl: string = API_CONFIG.RELAYER_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async getUserMessages(
    userAddress: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
      chainKey?: string;
      includeAllChains?: boolean;
      crossChainOnly?: boolean;
    } = {}
  ): Promise<RelayerResponse> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
        includeAllChains: (options.includeAllChains !== false).toString(),
        crossChainOnly: (options.crossChainOnly || false).toString(),
      });

      if (options.status) params.append('status', options.status);
      if (options.chainKey) params.append('chainKey', options.chainKey);

      const response = await fetch(`${this.baseUrl}/messages/user/${userAddress}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch user messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user messages:', error);
      throw error;
    }
  }

  async getPendingRequests(
    userAddress: string,
    options: {
      limit?: number;
      offset?: number;
      userConnectedChainId?: number;
    } = {}
  ): Promise<PendingRequestsResponse> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
      });

      if (options.userConnectedChainId) {
        params.append('userConnectedChainId', options.userConnectedChainId.toString());
      }

      const response = await fetch(`${this.baseUrl}/messages/pending/${userAddress}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch pending requests: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      throw error;
    }
  }

  async getCrossChainMessages(
    userAddress: string,
    options: {
      userConnectedChainId?: number;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<RelayerResponse> {
    try {
      const params = new URLSearchParams({
        limit: (options.limit || 50).toString(),
        offset: (options.offset || 0).toString(),
      });

      if (options.userConnectedChainId) {
        params.append('userConnectedChainId', options.userConnectedChainId.toString());
      }

      const response = await fetch(`${this.baseUrl}/messages/cross-chain/${userAddress}?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch cross-chain messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cross-chain messages:', error);
      throw error;
    }
  }

  async getRequestHistory(requestId: string): Promise<RelayerMessage | null> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/request/${requestId}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to fetch request history: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching request history:', error);
      throw error;
    }
  }

  async searchMessages(filters: {
    requester?: string;
    target?: string;
    token?: string;
    minAmount?: number;
    maxAmount?: number;
    status?: string;
    chainKey?: string;
    fromDate?: Date;
    toDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<RelayerResponse> {
    try {
      const params = new URLSearchParams({
        limit: (filters.limit || 50).toString(),
        offset: (filters.offset || 0).toString(),
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && key !== 'limit' && key !== 'offset') {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`${this.baseUrl}/messages/search?${params}`);

      if (!response.ok) {
        throw new Error(`Failed to search messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  async manualRelay(requestId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/relay/${requestId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to manually relay message: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error manually relaying message:', error);
      return false;
    }
  }

  async getMessageStats(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/stats`);

      if (!response.ok) {
        throw new Error(`Failed to fetch message stats: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching message stats:', error);
      throw error;
    }
  }

  async exportUserData(userAddress: string, format: 'json' | 'csv' = 'json'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/messages/export/${userAddress}?format=${format}`);

      if (!response.ok) {
        throw new Error(`Failed to export user data: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time updates
  connectWebSocket(userAddress: string, callbacks: {
    onMessage?: (message: any) => void;
    onError?: (error: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onOpen?: (event: Event) => void;
  } = {}): WebSocket {
    const wsUrl = API_CONFIG.RELAYER_WS_URL;
    const ws = new WebSocket(wsUrl);

    ws.onopen = (event) => {
      console.log('WebSocket connected to relayer');

      // Subscribe to user-specific updates
      ws.send(JSON.stringify({
        type: 'subscribe_user',
        userAddress
      }));

      callbacks.onOpen?.(event);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        callbacks.onMessage?.(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      callbacks.onError?.(error);
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed');
      callbacks.onClose?.(event);
    };

    return ws;
  }

  // Convert RelayerMessage to PaymentRequest format for consistency
  convertToPaymentRequest(message: RelayerMessage): PaymentRequest {
    return {
      id: message.requestId,
      requester: message.summary.requester,
      target: message.summary.target,
      amount: message.summary.amount,
      token: message.summary.token,
      originChain: 0, // Will be mapped from chain name
      targetChain: 0, // Will be mapped from chain name
      message: message.summary.message,
      status: this.mapStatus(message.summary.status),
      messageStatus: 0, // Default
      timestamp: message.summary.createdAt,
      expiryTime: message.summary.expiryTime,
      fulfillmentTxHash: '',
      messageHash: ''
    };
  }

  private mapStatus(status: string): number {
    switch (status.toLowerCase()) {
      case 'pending': return 0;
      case 'fulfilled': return 1;
      case 'cancelled': return 2;
      case 'expired': return 3;
      default: return 0;
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Relayer health check failed:', error);
      return false;
    }
  }
}

export const relayerService = new RelayerService(); 