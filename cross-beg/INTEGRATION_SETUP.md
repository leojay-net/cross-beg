# CrossBeg Integration Setup

This document outlines the setup process for the CrossBeg payment request system integration between the frontend, contracts, and relayer.

## Overview

The CrossBeg system consists of three main components:
1. **Frontend (React + Privy)** - User interface for creating and managing payment requests
2. **Smart Contracts** - On-chain logic for payment requests across multiple chains
3. **Relayer Service** - Cross-chain message delivery and indexing service

## Features Implemented

### ✅ Wallet Integration
- Privy wallet connection with support for multiple wallets
- Multi-chain support (Sepolia, Base Sepolia, Optimism Sepolia, Mantle Sepolia, Polygon Amoy, Arbitrum Sepolia)
- Chain switching functionality

### ✅ Payment Request Creation
- Create payment requests with target chain selection
- Support for cross-chain requests
- Integration with smart contracts via ethers.js
- Real-time transaction feedback

### ✅ Cross-Chain Message Handling
- Relayer service integration for cross-chain message delivery
- Real-time message indexing and status updates
- WebSocket support for live updates

### ✅ Dashboard Features
- View incoming payment requests from all supported chains
- Track outgoing payment requests with status updates
- Transaction history with cross-chain indicators
- Real-time refresh functionality

## Setup Instructions

### 1. Environment Configuration

Create a `.env` file in the `cross-beg` directory:

```env
# Privy Configuration
VITE_PRIVY_APP_ID=your-privy-app-id-here

# Relayer Configuration
VITE_RELAYER_URL=http://localhost:3001

# Optional: Custom RPC URLs
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
VITE_BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
VITE_OPTIMISM_SEPOLIA_RPC_URL=https://sepolia.optimism.io
VITE_MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
VITE_POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
VITE_ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

### 2. Privy Setup

1. Sign up for a Privy account at [privy.io](https://privy.io)
2. Create a new app and get your App ID
3. Configure supported chains in your Privy dashboard
4. Update the `VITE_PRIVY_APP_ID` in your `.env` file

### 3. Contract Deployment

Ensure the CrossBeg contracts are deployed on all supported chains:
- Sepolia: `0xfCeE63FC08D18A63e069536586Da11e32B49000B`
- Base Sepolia: `0x603067937be01a88e5Bd848FD4930a9b28da8fE6`
- Optimism Sepolia: `0x603067937be01a88e5Bd848FD4930a9b28da8fE6`
- Mantle Sepolia: `0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a`
- Polygon Amoy: `0x603067937be01a88e5Bd848FD4930a9b28da8fE6`
- Arbitrum Sepolia: `0x603067937be01a88e5Bd848FD4930a9b28da8fE6`

### 4. Relayer Service

1. Navigate to the relayer directory: `cd ../relayer`
2. Install dependencies: `npm install`
3. Configure environment variables (see `env.example`)
4. Start the relayer: `npm start`

### 5. Frontend Development

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Open `http://localhost:5173` in your browser

## Usage Flow

### Creating a Payment Request

1. **Connect Wallet**: Use Privy to connect your wallet
2. **Navigate to New Request**: Click "New Request" on the dashboard
3. **Fill Request Details**:
   - Recipient address or ENS name
   - Amount and token
   - Target chain (where recipient should pay)
   - Optional message
4. **Submit**: Transaction is sent to the smart contract
5. **Cross-Chain Delivery**: If cross-chain, relayer picks up the event and delivers to target chain

### Receiving Payment Requests

1. **Dashboard**: View incoming requests in the "Incoming" tab
2. **Cross-Chain Requests**: Automatically fetched from relayer service
3. **Local Requests**: Fetched directly from current chain's contract
4. **Real-Time Updates**: WebSocket connection provides live updates

### Payment Flow (Future Implementation)

The current implementation focuses on request creation and delivery. Payment fulfillment will be implemented in the next phase, including:
- Token bridging integration
- Multi-chain payment processing
- Automatic fulfillment confirmation

## Technical Architecture

### Frontend Services

- **ContractService**: Handles smart contract interactions
- **RelayerService**: Manages API calls to the relayer
- **WalletContext**: Privy integration and wallet state management

### Smart Contract Integration

- **ABI Definitions**: Complete function and event signatures
- **Multi-Chain Support**: Consistent contract addresses across chains
- **Event Listening**: Real-time event processing

### Relayer Integration

- **Message Indexing**: Cross-chain message tracking
- **Real-Time Updates**: WebSocket connections
- **API Endpoints**: RESTful API for message retrieval

## Troubleshooting

### Common Issues

1. **Wallet Connection**: Ensure Privy App ID is correctly configured
2. **Chain Switching**: Some wallets may require manual network addition
3. **Relayer Connection**: Verify relayer service is running on port 3001
4. **Contract Interactions**: Check that contracts are deployed and accessible

### Development Tips

- Use browser developer tools to monitor network requests
- Check console logs for detailed error messages
- Verify chain IDs match between frontend and wallet
- Test with small amounts on testnets first

## Next Steps

1. **Payment Fulfillment**: Implement actual token transfers
2. **Bridging Integration**: Add cross-chain token bridging
3. **Enhanced UI**: Improve user experience and error handling
4. **Testing**: Comprehensive testing across all supported chains
5. **Production Deployment**: Deploy to mainnet with proper security measures 