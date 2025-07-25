import { ethers } from 'ethers';
import { CROSSBEG_ABI, PaymentRequest, CreatePaymentRequestParams, DEFAULT_EXPIRY_TIME } from '@/config/contracts';
import { getChainConfig, getChainKeyById, getSupportedChainIds } from '@/config/chains';

export interface NetworkSwitchError extends Error {
  code: 'UNSUPPORTED_NETWORK';
  currentChainId: number;
  suggestedChainId: number;
  suggestedChainName: string;
}

// Map mainnet chain IDs to their testnet equivalents
const MAINNET_TO_TESTNET_MAP: Record<number, { chainId: number; name: string }> = {
  8453: { chainId: 84532, name: 'Base Sepolia' }, // Base Mainnet -> Base Sepolia
  1: { chainId: 11155111, name: 'Sepolia' }, // Ethereum -> Sepolia
  10: { chainId: 11155420, name: 'Optimism Sepolia' }, // Optimism -> Optimism Sepolia
  42161: { chainId: 421614, name: 'Arbitrum Sepolia' }, // Arbitrum -> Arbitrum Sepolia
  137: { chainId: 80002, name: 'Polygon Amoy' }, // Polygon -> Polygon Amoy
  5000: { chainId: 5003, name: 'Mantle Sepolia' }, // Mantle -> Mantle Sepolia
};

export class ContractService {
  private providers: Map<number, ethers.Provider> = new Map();
  private contracts: Map<number, ethers.Contract> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize providers for all supported chains using the chain configs
    const chainKeys = ['sepolia', 'baseSepolia', 'optimismSepolia', 'mantleSepolia', 'polygonAmoy', 'arbitrumSepolia'];

    chainKeys.forEach(chainKey => {
      const config = getChainConfig(chainKey);
      if (config) {
        const provider = new ethers.JsonRpcProvider(config.rpcUrl);
        this.providers.set(config.chainId, provider);

        const contract = new ethers.Contract(
          config.contractAddress,
          CROSSBEG_ABI,
          provider
        );
        this.contracts.set(config.chainId, contract);
      }
    });
  }

  async createPaymentRequest(
    params: CreatePaymentRequestParams,
    signer: ethers.Signer
  ): Promise<{ requestId: string; txHash: string }> {
    try {
      const chainId = await signer.provider?.getNetwork().then(n => Number(n.chainId));
      if (!chainId) throw new Error('Unable to determine chain ID');

      const chainKey = getChainKeyById(chainId);
      if (!chainKey) {
        // Check if user is on a mainnet that has a testnet equivalent
        const testnetEquivalent = MAINNET_TO_TESTNET_MAP[chainId];
        if (testnetEquivalent) {
          const error = new Error(
            `CrossBeg currently supports testnet only. Please switch from your current network to ${testnetEquivalent.name} to continue.`
          ) as NetworkSwitchError;
          error.code = 'UNSUPPORTED_NETWORK';
          error.currentChainId = chainId;
          error.suggestedChainId = testnetEquivalent.chainId;
          error.suggestedChainName = testnetEquivalent.name;
          throw error;
        } else {
          const supportedChains = getSupportedChainIds();
          throw new Error(
            `Unsupported chain ID: ${chainId}. Supported chains: ${supportedChains.join(', ')}`
          );
        }
      }

      const config = getChainConfig(chainKey);
      if (!config) throw new Error(`Chain config not found for ${chainKey}`);

      const contract = new ethers.Contract(
        config.contractAddress,
        CROSSBEG_ABI,
        signer
      );

      const expiryTime = params.expiryTime || DEFAULT_EXPIRY_TIME;
      const amountWei = ethers.parseUnits(params.amount, 18); // Assuming 18 decimals

      console.log('Creating payment request with params:', {
        target: params.target,
        amount: amountWei.toString(),
        token: params.token,
        targetChain: params.targetChain,
        message: params.message,
        expiryTime
      });

      const tx = await contract.createPaymentRequest(
        params.target,
        amountWei,
        params.token,
        params.targetChain,
        params.message,
        expiryTime
      );

      const receipt = await tx.wait();

      // Extract request ID from events
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === 'PaymentRequestCreated';
        } catch {
          return false;
        }
      });

      if (!event) throw new Error('PaymentRequestCreated event not found');

      const parsedEvent = contract.interface.parseLog(event);
      const requestId = parsedEvent?.args[0].toString();

      return {
        requestId,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Error creating payment request:', error);
      throw error;
    }
  }

  async getUserSentRequests(userAddress: string, chainId?: number): Promise<PaymentRequest[]> {
    try {
      // If chainId is provided, only check that chain
      if (chainId) {
        const contract = this.contracts.get(chainId);
        if (!contract) throw new Error(`Contract not found for chain ${chainId}`);

        const requestIds = await contract.getUserSentRequests(userAddress);
        const mutableRequestIds = Array.from(requestIds); // Fix: make a mutable copy
        if (mutableRequestIds.length === 0) return [];

        const requests = await contract.getPaymentRequests(mutableRequestIds);
        return requests.map((req: any) => this.formatPaymentRequest(req));
      }

      // If no chainId, check all supported chains for sent requests
      const allRequests: PaymentRequest[] = [];
      const chainIds = Array.from(this.contracts.keys());

      // Use Promise.allSettled to avoid one chain failure breaking others
      const results = await Promise.allSettled(
        chainIds.map(async (cId) => {
          const contract = this.contracts.get(cId);
          if (!contract) return [];

          const requestIds = await contract.getUserSentRequests(userAddress);
          const mutableRequestIds = Array.from(requestIds);
          if (mutableRequestIds.length === 0) return [];

          const requests = await contract.getPaymentRequests(mutableRequestIds);
          return requests.map((req: any) => this.formatPaymentRequest(req));
        })
      );

      // Collect all successful results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allRequests.push(...result.value);
        }
      });

      return allRequests;
    } catch (error) {
      console.error('Error fetching sent requests:', error);
      return [];
    }
  }

  async getUserReceivedRequests(userAddress: string, chainId?: number): Promise<PaymentRequest[]> {
    try {
      // If chainId is provided, only check that chain
      if (chainId) {
        const contract = this.contracts.get(chainId);
        if (!contract) throw new Error(`Contract not found for chain ${chainId}`);

        const requestIds = await contract.getUserReceivedRequests(userAddress);
        if (requestIds.length === 0) return [];

        const requests = await contract.getPaymentRequests(requestIds);
        return requests.map((req: any) => this.formatPaymentRequest(req));
      }

      // If no chainId, check all supported chains for received requests
      const allRequests: PaymentRequest[] = [];
      const chainIds = Array.from(this.contracts.keys());

      // Use Promise.allSettled to avoid one chain failure breaking others
      const results = await Promise.allSettled(
        chainIds.map(async (cId) => {
          const contract = this.contracts.get(cId);
          if (!contract) return [];

          const requestIds = await contract.getUserReceivedRequests(userAddress);
          if (requestIds.length === 0) return [];

          const requests = await contract.getPaymentRequests(requestIds);
          return requests.map((req: any) => this.formatPaymentRequest(req));
        })
      );

      // Collect all successful results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          allRequests.push(...result.value);
        }
      });

      return allRequests;
    } catch (error) {
      console.error('Error fetching received requests:', error);
      return [];
    }
  }

  async getPaymentRequest(requestId: string, chainId: number): Promise<PaymentRequest | null> {
    try {
      const contract = this.contracts.get(chainId);
      if (!contract) throw new Error(`Contract not found for chain ${chainId}`);

      const request = await contract.getPaymentRequest(requestId);

      return this.formatPaymentRequest(request);
    } catch (error) {
      console.error('Error fetching payment request:', error);
      return null;
    }
  }

  async fulfillPaymentRequest(
    requestId: string,
    txHash: string,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      const chainId = await signer.provider?.getNetwork().then(n => Number(n.chainId));
      if (!chainId) throw new Error('Unable to determine chain ID');

      const chainKey = getChainKeyById(chainId);
      if (!chainKey) throw new Error(`Unsupported chain ID: ${chainId}`);

      const config = getChainConfig(chainKey);
      if (!config) throw new Error(`Chain config not found for ${chainKey}`);

      const contract = new ethers.Contract(
        config.contractAddress,
        CROSSBEG_ABI,
        signer
      );

      const tx = await contract.fulfillPaymentRequest(requestId, txHash);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      console.error('Error fulfilling payment request:', error);
      throw error;
    }
  }

  async cancelPaymentRequest(requestId: string, signer: ethers.Signer): Promise<string> {
    try {
      const chainId = await signer.provider?.getNetwork().then(n => Number(n.chainId));
      if (!chainId) throw new Error('Unable to determine chain ID');

      const chainKey = getChainKeyById(chainId);
      if (!chainKey) throw new Error(`Unsupported chain ID: ${chainId}`);

      const config = getChainConfig(chainKey);
      if (!config) throw new Error(`Chain config not found for ${chainKey}`);

      const contract = new ethers.Contract(
        config.contractAddress,
        CROSSBEG_ABI,
        signer
      );

      const tx = await contract.cancelPaymentRequest(requestId);
      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error) {
      console.error('Error cancelling payment request:', error);
      throw error;
    }
  }

  private formatPaymentRequest(req: any): PaymentRequest {
    return {
      id: req.id.toString(),
      requester: req.requester,
      target: req.target,
      amount: ethers.formatUnits(req.amount, 18),
      token: req.token,
      originChain: Number(req.originChain),
      targetChain: Number(req.targetChain),
      message: req.message,
      status: Number(req.status),
      messageStatus: Number(req.messageStatus),
      timestamp: Number(req.timestamp) * 1000, // Convert to milliseconds
      expiryTime: Number(req.expiryTime) * 1000, // Convert to milliseconds
      fulfillmentTxHash: req.fulfillmentTxHash,
      messageHash: req.messageHash
    };
  }

  // Utility method to check if a chain is supported
  isChainSupported(chainId: number): boolean {
    return this.contracts.has(chainId);
  }

  // Get supported chain IDs
  getSupportedChainIds(): number[] {
    return Array.from(this.contracts.keys());
  }
}

export const contractService = new ContractService();