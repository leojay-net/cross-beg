#!/bin/bash

# Test script for CrossBeg chain configuration
# This script tests the configuration without actually running it

set -e

echo "🧪 Testing CrossBeg Configuration Setup..."
echo "========================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env exists
if [ ! -f .env ]; then
    log_error ".env file not found"
    echo "Please create a .env file with the following variables:"
    echo ""
    echo "PRIVATE_KEY=your_private_key"
    echo "SEPOLIA_RPC_URL=your_sepolia_rpc"
    echo "SEPOLIA_CROSSBEG=0x..."
    echo "BASE_SEPOLIA_RPC_URL=your_base_sepolia_rpc"
    echo "BASE_SEPOLIA_CROSSBEG=0x..."
    echo "OPTIMISM_SEPOLIA_RPC_URL=your_optimism_sepolia_rpc"
    echo "OPTIMISM_SEPOLIA_CROSSBEG=0x..."
    echo "MANTLE_SEPOLIA_RPC_URL=your_mantle_sepolia_rpc"
    echo "MANTLE_SEPOLIA_CROSSBEG=0x..."
    echo "POLYGON_AMOY_RPC_URL=your_polygon_amoy_rpc"
    echo "POLYGON_AMOY_CROSSBEG=0x..."
    echo "ARBITRUM_SEPOLIA_RPC_URL=your_arbitrum_sepolia_rpc"
    echo "ARBITRUM_SEPOLIA_CROSSBEG=0x..."
    exit 1
fi

source .env

# Check required environment variables
required_vars=(
    "PRIVATE_KEY"
    "SEPOLIA_RPC_URL" "SEPOLIA_CROSSBEG"
    "BASE_SEPOLIA_RPC_URL" "BASE_SEPOLIA_CROSSBEG" 
    "OPTIMISM_SEPOLIA_RPC_URL" "OPTIMISM_SEPOLIA_CROSSBEG"
    "MANTLE_SEPOLIA_RPC_URL" "MANTLE_SEPOLIA_CROSSBEG"
    "POLYGON_AMOY_RPC_URL" "POLYGON_AMOY_CROSSBEG"
    "ARBITRUM_SEPOLIA_RPC_URL" "ARBITRUM_SEPOLIA_CROSSBEG"
)

log_info "Checking environment variables..."
missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    log_error "Missing required environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    exit 1
fi
log_success "All environment variables present"

# Test compilation
log_info "Testing contract compilation..."
if forge build --silent; then
    log_success "Contracts compile successfully"
else
    log_error "Contract compilation failed"
    exit 1
fi

# Test script syntax
log_info "Testing configuration script syntax..."
if forge script script/ConfigureChains.s.sol:ConfigureChainsScript --help >/dev/null 2>&1; then
    log_success "Configuration script syntax is valid"
else
    log_error "Configuration script has syntax errors"
    exit 1
fi

# Test RPC connections (non-destructive)
declare -A chains
chains[sepolia]="Ethereum Sepolia|$SEPOLIA_RPC_URL"
chains[baseSepolia]="Base Sepolia|$BASE_SEPOLIA_RPC_URL"
chains[optimismSepolia]="Optimism Sepolia|$OPTIMISM_SEPOLIA_RPC_URL"
chains[mantleSepolia]="Mantle Sepolia|$MANTLE_SEPOLIA_RPC_URL"
chains[polygonAmoy]="Polygon Amoy|$POLYGON_AMOY_RPC_URL"
chains[arbitrumSepolia]="Arbitrum Sepolia|$ARBITRUM_SEPOLIA_RPC_URL"

log_info "Testing RPC connections..."
for chain_key in "${!chains[@]}"; do
    IFS='|' read -r chain_name rpc_url <<< "${chains[$chain_key]}"
    
    if cast block latest --rpc-url "$rpc_url" >/dev/null 2>&1; then
        log_success "$chain_name RPC connection OK"
    else
        log_warning "$chain_name RPC connection failed"
    fi
done

# Test contract accessibility
log_info "Testing contract accessibility..."
contracts=(
    "Ethereum Sepolia|$SEPOLIA_RPC_URL|$SEPOLIA_CROSSBEG"
    "Base Sepolia|$BASE_SEPOLIA_RPC_URL|$BASE_SEPOLIA_CROSSBEG"
    "Optimism Sepolia|$OPTIMISM_SEPOLIA_RPC_URL|$OPTIMISM_SEPOLIA_CROSSBEG"
    "Mantle Sepolia|$MANTLE_SEPOLIA_RPC_URL|$MANTLE_SEPOLIA_CROSSBEG"
    "Polygon Amoy|$POLYGON_AMOY_RPC_URL|$POLYGON_AMOY_CROSSBEG"
    "Arbitrum Sepolia|$ARBITRUM_SEPOLIA_RPC_URL|$ARBITRUM_SEPOLIA_CROSSBEG"
)

for contract_info in "${contracts[@]}"; do
    IFS='|' read -r chain_name rpc_url contract_address <<< "$contract_info"
    
    if [ "$contract_address" = "0x0000000000000000000000000000000000000000" ] || [ -z "$contract_address" ]; then
        log_warning "$chain_name contract address not set"
        continue
    fi
    
    if cast call "$contract_address" "nextRequestId()" --rpc-url "$rpc_url" >/dev/null 2>&1; then
        log_success "$chain_name contract is accessible"
    else
        log_warning "$chain_name contract is not accessible"
    fi
done

echo ""
log_success "Test completed! You can now run the configuration script:"
echo ""
echo "  ./configure-all-chains.sh                    # Configure all chains"
echo "  ./configure-all-chains.sh single sepolia     # Configure single chain"
echo "  ./configure-all-chains.sh check              # Check current configuration"
echo "  ./configure-all-chains.sh help               # Show help"
