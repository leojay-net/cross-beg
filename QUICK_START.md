# CrossBeg Quick Start Guide

## 🎯 Integration Complete!

The CrossBeg frontend has been successfully integrated with the smart contracts and relayer service. Here's how to get everything running:

## 🚀 Quick Start

### 1. Start the Relayer

```bash
cd relayer
./start-relayer.sh
```

The relayer will:
- ✅ Automatically rebuild SQLite module if needed
- ✅ Start indexing all supported chains
- ✅ Provide API endpoints on `http://localhost:3001`

### 2. Get Privy App ID

1. Go to [privy.io](https://privy.io)
2. Sign up and create a new app
3. Copy your App ID

### 3. Start the Frontend

```bash
cd cross-beg
./start-frontend.sh
```

This will:
- ✅ Create `.env` file if it doesn't exist
- ✅ Start the development server on `http://localhost:5173`

**Important:** Update the `.env` file with your actual Privy App ID:
```env
VITE_PRIVY_APP_ID=your-actual-privy-app-id
VITE_RELAYER_URL=http://localhost:3001
```

## 🔄 How It Works

### Payment Request Flow

1. **Connect Wallet** → User connects via Privy (MetaMask, WalletConnect, etc.)
2. **Create Request** → User creates payment request targeting any supported chain
3. **Smart Contract** → Transaction sent to CrossBeg contract on current chain
4. **Cross-Chain Relay** → If cross-chain, relayer picks up event and delivers to target chain
5. **Recipient Notification** → Target user sees incoming request in dashboard
6. **Real-Time Updates** → WebSocket and refresh functionality keep UI updated

### Supported Chains

- ✅ Sepolia (Ethereum Testnet)
- ✅ Base Sepolia
- ✅ Optimism Sepolia
- ✅ Mantle Sepolia
- ✅ Polygon Amoy
- ✅ Arbitrum Sepolia

## 🎮 Testing the Integration

### Basic Flow Test

1. **Open Frontend**: `http://localhost:5173`
2. **Connect Wallet**: Use Privy to connect your wallet
3. **Create Request**: 
   - Click "New Request"
   - Enter recipient address
   - Choose amount and token
   - Select target chain (different from your current chain for cross-chain test)
   - Add optional message
   - Submit transaction
4. **View Incoming**: Switch to recipient's wallet and check "Incoming" tab
5. **Real-Time Updates**: Use refresh button to see latest requests

### API Testing

Test relayer endpoints:
```bash
# Health check
curl http://localhost:3001/health

# Get messages for a user
curl "http://localhost:3001/messages/user/YOUR_ADDRESS"

# Get pending requests
curl "http://localhost:3001/messages/pending/YOUR_ADDRESS"
```

## 📋 Features Implemented

### ✅ Wallet Integration
- Privy authentication with multiple wallet support
- Multi-chain connection and switching
- Real-time wallet state management

### ✅ Smart Contract Integration
- Contract interaction via ethers.js
- Multi-chain contract deployment support
- Transaction handling with proper error management
- Event listening and processing

### ✅ Cross-Chain Messaging
- Relayer service for message delivery
- Real-time indexing across all chains
- WebSocket support for live updates
- Message status tracking and history

### ✅ Enhanced UI
- Chain selection for cross-chain requests
- Real-time dashboard with incoming/outgoing/history tabs
- Cross-chain indicators and chain information
- Transaction feedback and error handling

## 🔧 Troubleshooting

### Common Issues

1. **Relayer SQLite Error**: ✅ **FIXED** - `npm start` now automatically rebuilds SQLite module if needed
2. **Wallet Connection**: Ensure Privy App ID is correctly set in `.env`
3. **Chain Switching**: Some wallets require manual network addition
4. **API Errors**: Verify relayer is running on port 3001

### ✅ Recent Fix

The SQLite version mismatch issue has been resolved! The relayer's `npm start` command now automatically:
- Checks if `better-sqlite3` module is compatible with current Node.js version
- Rebuilds the module if needed
- Starts the relayer service

You can now run either:
- `npm start` (will use environment variables if set)
- `./start-relayer.sh` (includes default test configuration)

### Development Tips

- Check browser console for detailed error messages
- Monitor relayer logs in `relayer/logs/combined.log`
- Use network tab to debug API calls
- Test with small amounts on testnets first

## 🚧 Current Limitations

- **Payment Fulfillment**: Currently shows UI only (actual token transfers not implemented)
- **Token Bridging**: Cross-chain token movement not yet implemented
- **Production Security**: Uses test keys and public RPC endpoints

## 🎯 Next Steps

1. **Token Bridging**: Implement actual cross-chain token transfers
2. **Payment Processing**: Add real token transfer functionality
3. **Enhanced Security**: Production-ready key management
4. **Performance**: Optimize for larger transaction volumes
5. **UI/UX**: Polish user interface and error handling

## 📞 Support

The integration is complete and functional for the core payment request flow. Users can:

- ✅ Connect wallets across multiple chains
- ✅ Create payment requests targeting any supported chain  
- ✅ View incoming requests from all chains via relayer
- ✅ Experience real-time cross-chain message delivery

The foundation is solid for building out the full payment and bridging functionality! 