# Li.Fi Integration for CrossBeg

This integration allows users to pay requests from any supported chain using Li.Fi's cross-chain bridge protocol.

## Features

- **Cross-Chain Payments**: Pay from any supported chain to any other supported chain
- **Automatic Token Bridging**: Li.Fi handles the complex bridging process
- **Real-time Quotes**: Get accurate fee estimates before executing transactions
- **Status Monitoring**: Track your transfer progress across chains
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Supported Chains

- Ethereum Sepolia
- Base Sepolia
- Optimism Sepolia
- Arbitrum Sepolia
- Mantle Sepolia
- Polygon Amoy

## Supported Tokens

- Native tokens (ETH, MATIC, MNT)
- USDC (on all chains)
- USDT (on select chains)

## How It Works

### 1. User Flow

1. User receives a payment request (e.g., 100 USDC on Optimism Sepolia)
2. User has funds on a different chain (e.g., Base Sepolia)
3. User opens the payment modal and selects their preferred source chain
4. Li.Fi provides a quote showing:
   - Expected output amount
   - Gas fees
   - Bridge fees
   - Estimated time
5. User approves and executes the transaction
6. Li.Fi handles the cross-chain transfer automatically

### 2. Technical Flow

1. **Quote Request**: App calls Li.Fi API to get available routes and fees
2. **Allowance Check**: Check if user has approved token spending
3. **Approval**: If needed, request approval for token spending
4. **Transaction Execution**: Send transaction to Li.Fi contract
5. **Monitoring**: Track transfer status until completion

## Files Added/Modified

### New Files

- `src/services/lifiService.ts` - Core Li.Fi integration service
- `src/hooks/useLifi.ts` - React hook for Li.Fi operations
- `src/components/LifiTestComponent.tsx` - Test component for Li.Fi
- `src/pages/LifiTest.tsx` - Test page for Li.Fi integration

### Modified Files

- `src/components/PayRequestModal.tsx` - Enhanced with Li.Fi cross-chain payments
- `src/pages/Dashboard.tsx` - Updated to pass chain/token info to modal
- `cross-beg/.env` - Added Li.Fi API URL configuration

## Environment Variables

```properties
# Li.Fi API Configuration
VITE_LIFI_API_URL=https://li.quest/v1
```

## Usage Example

```typescript
import { useLifi } from '@/hooks/useLifi';

function MyComponent() {
  const lifi = useLifi({
    onQuoteReceived: (quote) => console.log('Quote:', quote),
    onTransactionSent: (txHash) => console.log('TX:', txHash),
    onTransferComplete: (status) => console.log('Complete:', status),
  });

  const handleCrossChainTransfer = async () => {
    // Get quote
    const quote = await lifi.getQuote(
      'baseSepolia',     // from chain
      'optimismSepolia', // to chain  
      'USDC',           // from token
      'USDC',           // to token
      '1000000'         // amount (in token's smallest unit)
    );

    // Execute transfer
    await lifi.executeTransfer();
  };
}
```

## Testing

Visit `/lifi-test` in the application to test the Li.Fi integration with a dedicated UI.

## Production Considerations

1. **Error Handling**: Implement comprehensive error handling for failed transfers
2. **Gas Estimation**: Show accurate gas estimates to users
3. **Slippage Protection**: Consider slippage tolerance for price-sensitive transfers
4. **Alternative Routes**: Show multiple route options when available
5. **Time Estimates**: Display expected transfer completion times
6. **Transaction Monitoring**: Implement robust status checking and user notifications

## Benefits for CrossBeg Users

- **Flexibility**: Pay from any chain you have funds on
- **Cost Optimization**: Choose the most cost-effective route
- **User Experience**: Simplified cross-chain payments without manual bridging
- **Reliability**: Li.Fi's proven cross-chain infrastructure
