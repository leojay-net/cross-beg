#!/bin/bash

# CrossBeg Testnet Deployment Script
set -e

# Add foundry to PATH
export PATH="$HOME/.foundry/bin:$PATH"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== CrossBeg Testnet Deployment Script ===${NC}"

# Check .env file
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    echo "Create .env with: PRIVATE_KEY=0x... and RELAYER_ADDRESS=0x..."
    exit 1
fi

source .env

if [ -z "$PRIVATE_KEY" ] || [ -z "$RELAYER_ADDRESS" ]; then
    echo -e "${RED}Error: PRIVATE_KEY and RELAYER_ADDRESS must be set in .env${NC}"
    exit 1
fi

# Default RPC URLs
SEPOLIA_RPC=${SEPOLIA_RPC_URL:-"https://eth-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"}
POLYGON_AMOY_RPC=${POLYGON_AMOY_RPC_URL:-"https://polygon-amoy.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"}
BASE_SEPOLIA_RPC=${BASE_SEPOLIA_RPC_URL:-"https://base-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"}
ARBITRUM_SEPOLIA_RPC=${ARBITRUM_SEPOLIA_RPC_URL:-"https://arb-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"}
OPTIMISM_SEPOLIA_RPC=${OPTIMISM_SEPOLIA_RPC_URL:-"https://opt-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP"}
MANTLE_SEPOLIA_RPC=${MANTLE_SEPOLIA_RPC_URL:-"https://rpc.sepolia.mantle.xyz"}

deploy_to_network() {
    local name=$1
    local rpc=$2
    local chain_id=$3
    
    echo -e "${YELLOW}Deploying to $name (Chain ID: $chain_id)...${NC}"
    
    if forge script script/CrossBeg.s.sol:CrossBegDeployScript \
        --rpc-url "$rpc" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --verify \
        -v; then
        echo -e "${GREEN}✅ Successfully deployed to $name${NC}"
        echo -e "${BLUE}📋 Copy the contract address from the logs above and add to .env${NC}"
    else
        echo -e "${RED}❌ Failed to deploy to $name${NC}"
        return 1
    fi
    echo ""
}

configure_network() {
    local name=$1
    local rpc=$2
    local address_var=$3
    
    if [ -z "${!address_var}" ]; then
        echo -e "${YELLOW}Skipping $name - address not set${NC}"
        return
    fi
    
    echo -e "${YELLOW}Configuring $name...${NC}"
    
    if CROSSBEG_ADDRESS="${!address_var}" forge script script/CrossBeg.s.sol:CrossBegDeployScript \
        --sig "configureSupportedChains()" \
        --rpc-url "$rpc" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        -v; then
        echo -e "${GREEN}✅ Configured $name${NC}"
    else
        echo -e "${RED}❌ Failed to configure $name${NC}"
    fi
    echo ""
}

# Main deployment
echo -e "${BLUE}Phase 1: Deploying to all networks${NC}"
echo ""

# Skip Sepolia since it's already deployed
echo -e "${GREEN}✅ Ethereum Sepolia already deployed at: 0xfCeE63FC08D18A63e069536586Da11e32B49000B${NC}"
echo ""

deploy_to_network "Polygon Amoy" "$POLYGON_AMOY_RPC" "80002"
sleep 5

deploy_to_network "Base Sepolia" "$BASE_SEPOLIA_RPC" "84532"
sleep 5

deploy_to_network "Arbitrum Sepolia" "$ARBITRUM_SEPOLIA_RPC" "421614"
sleep 5

deploy_to_network "Optimism Sepolia" "$OPTIMISM_SEPOLIA_RPC" "11155420"
sleep 5

deploy_to_network "Mantle Sepolia" "$MANTLE_SEPOLIA_RPC" "5003"

echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${YELLOW}Update your .env file with deployed addresses:${NC}"
echo "SEPOLIA_CROSSBEG=0xfCeE63FC08D18A63e069536586Da11e32B49000B"
echo "POLYGON_AMOY_CROSSBEG=0x..."
echo "BASE_SEPOLIA_CROSSBEG=0x..."
echo "ARBITRUM_SEPOLIA_CROSSBEG=0x..."
echo "OPTIMISM_SEPOLIA_CROSSBEG=0x..."
echo "MANTLE_SEPOLIA_CROSSBEG=0x..."
echo ""

read -p "Have you updated .env with addresses? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Phase 2: Configuring cross-chain support${NC}"
    source .env  # Reload to get new addresses
    
    configure_network "Ethereum Sepolia" "$SEPOLIA_RPC" "SEPOLIA_CROSSBEG"
    configure_network "Polygon Amoy" "$POLYGON_AMOY_RPC" "POLYGON_AMOY_CROSSBEG"
    configure_network "Base Sepolia" "$BASE_SEPOLIA_RPC" "BASE_SEPOLIA_CROSSBEG"
    configure_network "Arbitrum Sepolia" "$ARBITRUM_SEPOLIA_RPC" "ARBITRUM_SEPOLIA_CROSSBEG"
    configure_network "Optimism Sepolia" "$OPTIMISM_SEPOLIA_RPC" "OPTIMISM_SEPOLIA_CROSSBEG"
    configure_network "Mantle Sepolia" "$MANTLE_SEPOLIA_RPC" "MANTLE_SEPOLIA_CROSSBEG"
    
    echo -e "${GREEN}🎉 All done!${NC}"
else
    echo -e "${YELLOW}Run configuration manually after updating .env${NC}"
fi 