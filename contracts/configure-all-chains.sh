#!/bin/bash

# CrossBeg Chain Configuration Script
# This script configures all deployed contracts to support each other as target chains

set -e

echo "🚀 Starting CrossBeg Chain Configuration..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Skip environment validation for help command
if [ "${1:-configure}" != "help" ]; then
    # Check if .env file exists
    if [ ! -f .env ]; then
        log_error ".env file not found. Please create one based on env.example"
        exit 1
    fi

    # Load environment variables
    source .env

    # Verify required environment variables
    required_vars=(
        "PRIVATE_KEY"
        "SEPOLIA_RPC_URL" "SEPOLIA_CROSSBEG"
        "BASE_SEPOLIA_RPC_URL" "BASE_SEPOLIA_CROSSBEG" 
        "OPTIMISM_SEPOLIA_RPC_URL" "OPTIMISM_SEPOLIA_CROSSBEG"
        "MANTLE_SEPOLIA_RPC_URL" "MANTLE_SEPOLIA_CROSSBEG"
        "POLYGON_AMOY_RPC_URL" "POLYGON_AMOY_CROSSBEG"
        "ARBITRUM_SEPOLIA_RPC_URL" "ARBITRUM_SEPOLIA_CROSSBEG"
    )

    log_info "Verifying environment variables..."
    missing_vars=()
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        exit 1
    fi
    log_success "All environment variables verified"
fi

# Chain configurations (using | as delimiter to avoid issues with URLs containing colons)
chains_sepolia="11155111|Ethereum Sepolia|$SEPOLIA_RPC_URL|$SEPOLIA_CROSSBEG"
chains_baseSepolia="84532|Base Sepolia|$BASE_SEPOLIA_RPC_URL|$BASE_SEPOLIA_CROSSBEG"
chains_optimismSepolia="11155420|Optimism Sepolia|$OPTIMISM_SEPOLIA_RPC_URL|$OPTIMISM_SEPOLIA_CROSSBEG"
chains_mantleSepolia="5003|Mantle Sepolia|$MANTLE_SEPOLIA_RPC_URL|$MANTLE_SEPOLIA_CROSSBEG"
chains_polygonAmoy="80002|Polygon Amoy|$POLYGON_AMOY_RPC_URL|$POLYGON_AMOY_CROSSBEG"
chains_arbitrumSepolia="421614|Arbitrum Sepolia|$ARBITRUM_SEPOLIA_RPC_URL|$ARBITRUM_SEPOLIA_CROSSBEG"

# Chain order for processing
chain_keys=("sepolia" "baseSepolia" "optimismSepolia" "mantleSepolia" "polygonAmoy" "arbitrumSepolia")

# Function to get chain info
get_chain_info() {
    local key=$1
    case $key in
        "sepolia") echo "$chains_sepolia" ;;
        "baseSepolia") echo "$chains_baseSepolia" ;;
        "optimismSepolia") echo "$chains_optimismSepolia" ;;
        "mantleSepolia") echo "$chains_mantleSepolia" ;;
        "polygonAmoy") echo "$chains_polygonAmoy" ;;
        "arbitrumSepolia") echo "$chains_arbitrumSepolia" ;;
        *) echo "" ;;
    esac
}

# Function to configure a specific chain
configure_chain() {
    local chain_key=$1
    local chain_info=$(get_chain_info "$chain_key")
    
    if [ -z "$chain_info" ]; then
        log_error "Unknown chain key: $chain_key"
        return 1
    fi
    
    IFS='|' read -r chain_id chain_name rpc_url contract_address <<< "$chain_info"
    
    log_info "Configuring $chain_name (Chain ID: $chain_id)..."
    log_info "RPC URL: $rpc_url"
    log_info "Contract: $contract_address"
    
    # Validate contract address
    if [ "$contract_address" = "0x0000000000000000000000000000000000000000" ] || [ -z "$contract_address" ]; then
        log_error "Invalid contract address for $chain_name"
        return 1
    fi
    
    # Run the configuration script with better error handling
    log_info "Running configuration script for $chain_name..."
    
    if forge script script/ConfigureChains.s.sol:ConfigureChainsScript \
        --rpc-url "$rpc_url" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --legacy \
        -vvv; then
        log_success "Successfully configured $chain_name"
        return 0
    else
        log_error "Failed to configure $chain_name"
        return 1
    fi
}

# Function to check supported chains
check_chain() {
    local chain_key=$1
    local chain_info=$(get_chain_info "$chain_key")
    
    if [ -z "$chain_info" ]; then
        log_error "Unknown chain key: $chain_key"
        return 1
    fi
    
    IFS='|' read -r chain_id chain_name rpc_url contract_address <<< "$chain_info"
    
    log_info "Checking supported chains for $chain_name..."
    log_info "Contract: $contract_address"
    
    # Check if we can call the contract
    if cast call "$contract_address" \
        "nextRequestId()" \
        --rpc-url "$rpc_url" >/dev/null 2>&1; then
        log_success "Contract is accessible on $chain_name"
    else
        log_error "Cannot access contract on $chain_name"
        return 1
    fi
    
    # Check specific chains
    local test_chains=(11155111 84532 11155420 5003 80002 421614)
    
    for test_chain in "${test_chains[@]}"; do
        if [ "$test_chain" != "$chain_id" ]; then
            if cast call "$contract_address" \
                "supportedChains(uint32)" \
                "$test_chain" \
                --rpc-url "$rpc_url" 2>/dev/null | grep -q "true"; then
                log_success "Chain $test_chain is SUPPORTED on $chain_name"
            else
                log_warning "Chain $test_chain is NOT SUPPORTED on $chain_name"
            fi
        fi
    done
}

# Function to compile contracts
compile_contracts() {
    log_info "Compiling contracts..."
    if forge build; then
        log_success "Contracts compiled successfully"
        return 0
    else
        log_error "Failed to compile contracts"
        return 1
    fi
}

# Main execution
case "${1:-configure}" in
    "configure")
        log_info "Compiling contracts before configuration..."
        if ! compile_contracts; then
            log_error "Cannot proceed without successful compilation"
            exit 1
        fi
        
        echo ""
        log_info "Configuring all chains to support each other..."
        
        failed_chains=()
        successful_chains=()
        
        # Configure each chain
        for chain_key in "${chain_keys[@]}"; do
            if configure_chain "$chain_key"; then
                successful_chains+=("$chain_key")
            else
                failed_chains+=("$chain_key")
                log_warning "Configuration failed for $chain_key, continuing with others..."
            fi
            echo "" # Add spacing between chains
        done
        
        echo ""
        log_info "Configuration Summary:"
        if [ ${#successful_chains[@]} -gt 0 ]; then
            log_success "Successfully configured ${#successful_chains[@]} chains:"
            for chain in "${successful_chains[@]}"; do
                echo "  ✅ $chain"
            done
        fi
        
        if [ ${#failed_chains[@]} -gt 0 ]; then
            log_warning "Failed to configure ${#failed_chains[@]} chains:"
            for chain in "${failed_chains[@]}"; do
                echo "  ❌ $chain"
            done
            exit 1
        else
            log_success "All chains configured successfully!"
            log_success "Each chain now supports all other chains as targets"
        fi
        ;;
        
    "check")
        echo ""
        log_info "Checking supported chains for all contracts..."
        
        for chain_key in "${chain_keys[@]}"; do
            check_chain "$chain_key"
            echo ""
        done
        ;;
        
    "single")
        if [ -z "$2" ]; then
            log_error "Please specify a chain key"
            log_info "Available chains: ${chain_keys[*]}"
            exit 1
        fi
        
        if [ -z "$(get_chain_info "$2")" ]; then
            log_error "Unknown chain key: $2"
            log_info "Available chains: ${chain_keys[*]}"
            exit 1
        fi
        
        if ! compile_contracts; then
            log_error "Cannot proceed without successful compilation"
            exit 1
        fi
        
        configure_chain "$2"
        ;;
        
    "compile")
        compile_contracts
        ;;
        
    "test-connection")
        if [ -z "$2" ]; then
            log_error "Please specify a chain key"
            log_info "Available chains: ${chain_keys[*]}"
            exit 1
        fi
        
        chain_info=$(get_chain_info "$2")
        if [ -z "$chain_info" ]; then
            log_error "Unknown chain key: $2"
            exit 1
        fi
        
        IFS='|' read -r chain_id chain_name rpc_url contract_address <<< "$chain_info"
        
        log_info "Testing connection to $chain_name..."
        log_info "RPC URL: $rpc_url"
        log_info "Contract: $contract_address"
        
        # Test RPC connection
        if cast block latest --rpc-url "$rpc_url" >/dev/null 2>&1; then
            log_success "RPC connection successful"
        else
            log_error "RPC connection failed"
            exit 1
        fi
        
        # Test contract accessibility
        if cast call "$contract_address" "nextRequestId()" --rpc-url "$rpc_url" >/dev/null 2>&1; then
            log_success "Contract is accessible"
        else
            log_error "Contract is not accessible"
            exit 1
        fi
        ;;
        
    "help")
        echo "CrossBeg Chain Configuration Script"
        echo ""
        echo "Usage:"
        echo "  ./configure-all-chains.sh [command] [options]"
        echo ""
        echo "Commands:"
        echo "  configure           Configure all chains (default)"
        echo "  check              Check supported chains for all contracts"
        echo "  single <key>       Configure a specific chain only"
        echo "  compile            Compile contracts only"
        echo "  test-connection <key>  Test connection to a specific chain"
        echo "  help               Show this help message"
        echo ""
        echo "Chain keys: ${chain_keys[*]}"
        echo ""
        echo "Examples:"
        echo "  ./configure-all-chains.sh                    # Configure all chains"
        echo "  ./configure-all-chains.sh check              # Check all chains"
        echo "  ./configure-all-chains.sh single mantleSepolia # Configure only Mantle Sepolia"
        echo "  ./configure-all-chains.sh test-connection sepolia # Test Sepolia connection"
        echo "  ./configure-all-chains.sh compile            # Compile contracts only"
        ;;
        
    *)
        log_error "Unknown command: $1"
        echo "Run './configure-all-chains.sh help' for usage information"
        exit 1
        ;;
esac

echo ""
log_success "Script completed!" 