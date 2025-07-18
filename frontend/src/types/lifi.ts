// LiFi integration types
export interface LiFiRoute {
  id: string;
  fromChainId: number;
  toChainId: number;
  fromTokenAddress: string;
  toTokenAddress: string;
  fromAmount: string;
  toAmount: string;
  fromAmountUSD: string;
  toAmountUSD: string;
  gasCostUSD: string;
  steps: LiFiStep[];
  insurance?: {
    state: string;
    feeAmountUsd: string;
  };
  tags?: string[];
}

export interface LiFiStep {
  id: string;
  type: 'lifi' | 'cross' | 'swap';
  tool: string;
  toolDetails: {
    key: string;
    name: string;
    logoURI: string;
  };
  action: {
    fromChainId: number;
    toChainId: number;
    fromToken: LiFiToken;
    toToken: LiFiToken;
    fromAmount: string;
    toAmount: string;
    slippage: number;
  };
  estimate: {
    tool: string;
    fromAmount: string;
    toAmount: string;
    toAmountMin: string;
    approvalAddress: string;
    executionDuration: number;
    feeCosts: FeeCost[];
    gasCosts: GasCost[];
  };
}

export interface LiFiToken {
  address: string;
  chainId: number;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  priceUSD?: string;
}

export interface FeeCost {
  name: string;
  description?: string;
  percentage: string;
  token: LiFiToken;
  amount?: string;
  amountUSD?: string;
  included: boolean;
}

export interface GasCost {
  type: string;
  price: string;
  estimate: string;
  limit: string;
  amount: string;
  amountUSD: string;
  token: LiFiToken;
}

export interface LiFiQuoteRequest {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
  allowBridges?: string[];
  denyBridges?: string[];
  allowExchanges?: string[];
  denyExchanges?: string[];
  preferBridges?: string[];
  preferExchanges?: string[];
  integrator?: string;
}

export interface ExecuteStepRequest {
  route: LiFiRoute;
  stepIndex: number;
  fromAddress: string;
}

export interface LiFiExecutionStatus {
  status: 'STARTED' | 'ACTION_REQUIRED' | 'PENDING' | 'DONE' | 'FAILED' | 'CANCELLED';
  substatus?: string;
  substatusMessage?: string;
  txHash?: string;
  txLink?: string;
  gasUsed?: string;
  gasUsedUSD?: string;
  executionTime?: number;
}
