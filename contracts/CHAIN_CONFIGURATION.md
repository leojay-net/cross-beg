# CrossBeg Chain Configuration Guide

This guide explains how to configure all deployed CrossBeg contracts to support each other as target chains.

## Problem

When contracts are deployed to different chains, they need to be configured to recognize each other as valid target chains. Without this configuration, users will get `"CrossBeg: target chain not supported"` errors when trying to create cross-chain payment requests.

## Solution

We've created scripts to automatically configure all chains to support each other:

- `script/ConfigureChains.s.sol` - Solidity script for chain configuration
- `configure-all-chains.sh` - Shell script to run configuration on all chains

## Prerequisites

1. **Foundry installed**:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Environment variables set** in `.env` file:
   ```bash
   # Required for all chains
   RELAYER_PRIVATE_KEY=your_private_key_here
   
   # RPC URLs
   SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   BASE_SEPOLIA_RPC_URL=https://base-sepolia.g.alchemy.com/v2/YOUR_KEY
   OPTIMISM_SEPOLIA_RPC_URL=https://opt-sepolia.g.alchemy.com/v2/YOUR_KEY
   MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
   POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_KEY
   ARBITRUM_SEPOLIA_RPC_URL=https://arb-sepolia.g.alchemy.com/v2/YOUR_KEY
   
   # Contract addresses (from deployment)
   SEPOLIA_CROSSBEG=0xfCeE63FC08D18A63e069536586Da11e32B49000B
   BASE_SEPOLIA_CROSSBEG=0x603067937be01a88e5Bd848FD4930a9b28da8fE6
   OPTIMISM_SEPOLIA_CROSSBEG=0x603067937be01a88e5Bd848FD4930a9b28da8fE6
   MANTLE_SEPOLIA_CROSSBEG=0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a
   POLYGON_AMOY_CROSSBEG=0x603067937be01a88e5Bd848FD4930a9b28da8fE6
   ARBITRUM_SEPOLIA_CROSSBEG=0x603067937be01a88e5Bd848FD4930a9b28da8fE6
   ```

## Usage

### Configure All Chains (Recommended)

```bash
# Configure all chains to support each other
./configure-all-chains.sh

# Or explicitly
./configure-all-chains.sh configure
```

This will:
1. ✅ Configure Ethereum Sepolia to support all other chains
2. ✅ Configure Base Sepolia to support all other chains  
3. ✅ Configure Optimism Sepolia to support all other chains
4. ✅ Configure Mantle Sepolia to support all other chains
5. ✅ Configure Polygon Amoy to support all other chains
6. ✅ Configure Arbitrum Sepolia to support all other chains

### Check Current Configuration

```bash
# Check which chains are currently supported on all contracts
./configure-all-chains.sh check
```

### Configure Single Chain

```bash
# Configure only Mantle Sepolia (useful for fixing specific issues)
./configure-all-chains.sh single mantleSepolia

# Available chain keys: sepolia, baseSepolia, optimismSepolia, mantleSepolia, polygonAmoy, arbitrumSepolia
```

### Get Help

```bash
./configure-all-chains.sh help
```

## What the Scripts Do

### ConfigureChains.s.sol

- **`run()`**: Configures the current chain to support all other chains as targets
- **`configureSpecificChain(uint32)`**: Adds support for a specific chain only
- **`checkSupportedChains()`**: Shows which chains are currently supported

### configure-all-chains.sh

- Validates environment variables
- Runs the Solidity script on each chain
- Provides detailed logging and error handling
- Supports different modes (configure all, check, single chain)

## Expected Output

### Successful Configuration
```
🚀 Starting CrossBeg Chain Configuration...
==========================================
📋 Verifying environment variables...
✅ All environment variables verified

🔧 Configuring all chains to support each other...

🔧 Configuring Ethereum Sepolia (Chain ID: 11155111)...
   RPC URL: https://eth-sepolia.g.alchemy.com/v2/...
   Contract: 0xfCeE63FC08D18A63e069536586Da11e32B49000B
✅ Successfully configured Ethereum Sepolia

🔧 Configuring Base Sepolia (Chain ID: 84532)...
   RPC URL: https://base-sepolia.g.alchemy.com/v2/...
   Contract: 0x603067937be01a88e5Bd848FD4930a9b28da8fE6
✅ Successfully configured Base Sepolia

... (continues for all chains)

🎉 All chains configured successfully!
✅ Each chain now supports all other chains as targets
```

### Checking Configuration
```
🔍 Checking supported chains for Mantle Sepolia...
Contract address: 0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a
Ethereum Sepolia ( 11155111 ): SUPPORTED
Base Sepolia ( 84532 ): SUPPORTED  
Optimism Sepolia ( 11155420 ): SUPPORTED
Polygon Amoy ( 80002 ): SUPPORTED
Arbitrum Sepolia ( 421614 ): SUPPORTED
```

## Troubleshooting

### "Missing required environment variable"
- Ensure all RPC URLs and contract addresses are set in `.env`
- Copy from `env.example` and fill in your values

### "Current chain not found in configuration"
- The script couldn't match the current blockchain to a known configuration
- Verify you're running on a supported testnet

### "Contract address not set for current chain"  
- The contract address environment variable is missing or empty
- Check that the deployment was successful and the address is correct

### "Failed to configure [chain]"
- Network connectivity issues
- Insufficient gas or wrong private key
- Contract not deployed on that chain

## Manual Configuration (Alternative)

If the scripts don't work, you can manually call the contract:

```solidity
// On each contract, call:
addSupportedChain(targetChainId, targetContractAddress)

// For example, on Mantle Sepolia contract:
addSupportedChain(84532, 0x603067937be01a88e5Bd848FD4930a9b28da8fE6) // Base Sepolia
addSupportedChain(11155111, 0xfCeE63FC08D18A63e069536586Da11e32B49000B) // Ethereum Sepolia
// ... etc for all other chains
```

## Verification

After configuration, test by:

1. **Frontend**: Try creating payment requests between different chains
2. **Contract**: Call `supportedChains(chainId)` to verify each chain is supported
3. **Logs**: Check that no "target chain not supported" errors occur

## Chain IDs Reference

| Chain | Chain ID | Contract Address |
|-------|----------|------------------|
| Ethereum Sepolia | 11155111 | 0xfCeE63FC08D18A63e069536586Da11e32B49000B |
| Base Sepolia | 84532 | 0x603067937be01a88e5Bd848FD4930a9b28da8fE6 |
| Optimism Sepolia | 11155420 | 0x603067937be01a88e5Bd848FD4930a9b28da8fE6 |
| Mantle Sepolia | 5003 | 0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a |
| Polygon Amoy | 80002 | 0x603067937be01a88e5Bd848FD4930a9b28da8fE6 |
| Arbitrum Sepolia | 421614 | 0x603067937be01a88e5Bd848FD4930a9b28da8fE6 | 