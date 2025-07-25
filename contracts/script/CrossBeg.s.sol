// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CrossBegPaymentRequest} from "../src/CrossBeg.sol";

/**
 * @title CrossBeg Deployment Script - Testnet Only
 * @notice Deploys CrossBeg contracts to testnets using custom relayer pattern
 * @dev This script handles deployment and configuration of CrossBeg contracts on testnets
 */
contract CrossBegDeployScript is Script {
    // Network configurations
    struct NetworkConfig {
        uint32 chainId;
        string name;
        string rpcUrl;
        bool isTestnet;
    }

    // Supported testnet configurations only
    mapping(uint256 => NetworkConfig) public networkConfigs;

    // Deployed contract addresses (to be updated after each deployment)
    mapping(uint32 => address) public deployedContracts;

    function setUp() public {
        // TESTNETS ONLY
        networkConfigs[11155111] = NetworkConfig({
            chainId: 11155111,
            name: "Ethereum Sepolia",
            rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/demo",
            isTestnet: true
        });

        networkConfigs[80002] = NetworkConfig({
            chainId: 80002,
            name: "Polygon Amoy",
            rpcUrl: "https://rpc-amoy.polygon.technology",
            isTestnet: true
        });

        networkConfigs[84532] = NetworkConfig({
            chainId: 84532,
            name: "Base Sepolia",
            rpcUrl: "https://sepolia.base.org",
            isTestnet: true
        });

        networkConfigs[421614] = NetworkConfig({
            chainId: 421614,
            name: "Arbitrum Sepolia",
            rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
            isTestnet: true
        });

        networkConfigs[11155420] = NetworkConfig({
            chainId: 11155420,
            name: "Optimism Sepolia",
            rpcUrl: "https://sepolia.optimism.io",
            isTestnet: true
        });

        networkConfigs[5003] = NetworkConfig({
            chainId: 5003,
            name: "Mantle Sepolia",
            rpcUrl: "https://rpc.sepolia.mantle.xyz",
            isTestnet: true
        });
    }

    function run() public {
        uint256 chainId = block.chainid;
        NetworkConfig memory config = networkConfigs[chainId];

        require(config.chainId != 0, "Unsupported network");

        // Get relayer address from environment or use default
        address relayerAddress = vm.envOr(
            "RELAYER_ADDRESS",
            makeAddr("defaultRelayer")
        );

        console.log("=== CrossBeg Testnet Deployment ===");
        console.log("Deploying CrossBeg to", config.name);
        console.log("Chain ID:", chainId);
        console.log("Relayer address:", relayerAddress);

        vm.startBroadcast();

        // Deploy CrossBeg contract
        CrossBegPaymentRequest crossBeg = new CrossBegPaymentRequest(
            uint32(chainId),
            relayerAddress
        );

        vm.stopBroadcast();

        console.log("CrossBeg deployed at:", address(crossBeg));
        console.log("Owner:", crossBeg.owner());
        console.log("Local Chain ID:", crossBeg.localChainId());

        // Save deployment info
        _saveDeploymentInfo(chainId, address(crossBeg), config, relayerAddress);

        // Log deployment summary
        _logDeploymentSummary(config, address(crossBeg), relayerAddress);
    }

    /**
     * @notice Configure supported testnet chains for an already deployed contract
     * @dev Call this after deploying to multiple testnets
     */
    function configureSupportedChains() public {
        uint256 chainId = block.chainid;
        NetworkConfig memory config = networkConfigs[chainId];

        require(config.chainId != 0, "Unsupported testnet");
        require(config.isTestnet, "This script only supports testnets");

        // Get deployed contract address from environment
        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(
            crossBegAddress != address(0),
            "CrossBeg address not set in environment"
        );

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        console.log("Configuring supported testnet chains for", config.name);
        console.log("Contract address:", crossBegAddress);

        vm.startBroadcast();

        _configureTestnetChains(crossBeg, uint32(chainId));

        vm.stopBroadcast();

        console.log("Supported testnet chains configured successfully");
    }

    /**
     * @notice Configure testnet chains
     */
    function _configureTestnetChains(
        CrossBegPaymentRequest crossBeg,
        uint32 currentChain
    ) internal {
        // Ethereum Sepolia configuration
        if (currentChain == 11155111) {
            if (vm.envOr("POLYGON_AMOY_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    80002,
                    vm.envAddress("POLYGON_AMOY_CROSSBEG")
                );
                console.log("Added Polygon Amoy support");
            }
            if (vm.envOr("BASE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    84532,
                    vm.envAddress("BASE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Base Sepolia support");
            }
            if (
                vm.envOr("ARBITRUM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    421614,
                    vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Arbitrum Sepolia support");
            }
            if (
                vm.envOr("OPTIMISM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    11155420,
                    vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Optimism Sepolia support");
            }
            if (vm.envOr("MANTLE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    5003,
                    vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Mantle Sepolia support");
            }
        }
        // Polygon Amoy configuration
        else if (currentChain == 80002) {
            if (vm.envOr("SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    11155111,
                    vm.envAddress("SEPOLIA_CROSSBEG")
                );
                console.log("Added Ethereum Sepolia support");
            }
            if (vm.envOr("BASE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    84532,
                    vm.envAddress("BASE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Base Sepolia support");
            }
            if (
                vm.envOr("ARBITRUM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    421614,
                    vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Arbitrum Sepolia support");
            }
            if (
                vm.envOr("OPTIMISM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    11155420,
                    vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Optimism Sepolia support");
            }
            if (vm.envOr("MANTLE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    5003,
                    vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Mantle Sepolia support");
            }
        }
        // Base Sepolia configuration
        else if (currentChain == 84532) {
            if (vm.envOr("SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    11155111,
                    vm.envAddress("SEPOLIA_CROSSBEG")
                );
                console.log("Added Ethereum Sepolia support");
            }
            if (vm.envOr("POLYGON_AMOY_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    80002,
                    vm.envAddress("POLYGON_AMOY_CROSSBEG")
                );
                console.log("Added Polygon Amoy support");
            }
            if (
                vm.envOr("ARBITRUM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    421614,
                    vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Arbitrum Sepolia support");
            }
            if (
                vm.envOr("OPTIMISM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    11155420,
                    vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Optimism Sepolia support");
            }
            if (vm.envOr("MANTLE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    5003,
                    vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Mantle Sepolia support");
            }
        }
        // Arbitrum Sepolia configuration
        else if (currentChain == 421614) {
            if (vm.envOr("SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    11155111,
                    vm.envAddress("SEPOLIA_CROSSBEG")
                );
                console.log("Added Ethereum Sepolia support");
            }
            if (vm.envOr("POLYGON_AMOY_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    80002,
                    vm.envAddress("POLYGON_AMOY_CROSSBEG")
                );
                console.log("Added Polygon Amoy support");
            }
            if (vm.envOr("BASE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    84532,
                    vm.envAddress("BASE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Base Sepolia support");
            }
            if (
                vm.envOr("OPTIMISM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    11155420,
                    vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Optimism Sepolia support");
            }
            if (vm.envOr("MANTLE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    5003,
                    vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Mantle Sepolia support");
            }
        }
        // Optimism Sepolia configuration
        else if (currentChain == 11155420) {
            if (vm.envOr("SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    11155111,
                    vm.envAddress("SEPOLIA_CROSSBEG")
                );
                console.log("Added Ethereum Sepolia support");
            }
            if (vm.envOr("POLYGON_AMOY_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    80002,
                    vm.envAddress("POLYGON_AMOY_CROSSBEG")
                );
                console.log("Added Polygon Amoy support");
            }
            if (vm.envOr("BASE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    84532,
                    vm.envAddress("BASE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Base Sepolia support");
            }
            if (
                vm.envOr("ARBITRUM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    421614,
                    vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Arbitrum Sepolia support");
            }
            if (vm.envOr("MANTLE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    5003,
                    vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Mantle Sepolia support");
            }
        }
        // Mantle Sepolia configuration
        else if (currentChain == 5003) {
            if (vm.envOr("SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    11155111,
                    vm.envAddress("SEPOLIA_CROSSBEG")
                );
                console.log("Added Ethereum Sepolia support");
            }
            if (vm.envOr("POLYGON_AMOY_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    80002,
                    vm.envAddress("POLYGON_AMOY_CROSSBEG")
                );
                console.log("Added Polygon Amoy support");
            }
            if (vm.envOr("BASE_SEPOLIA_CROSSBEG", address(0)) != address(0)) {
                crossBeg.addSupportedChain(
                    84532,
                    vm.envAddress("BASE_SEPOLIA_CROSSBEG")
                );
                console.log("Added Base Sepolia support");
            }
            if (
                vm.envOr("ARBITRUM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    421614,
                    vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Arbitrum Sepolia support");
            }
            if (
                vm.envOr("OPTIMISM_SEPOLIA_CROSSBEG", address(0)) != address(0)
            ) {
                crossBeg.addSupportedChain(
                    11155420,
                    vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
                );
                console.log("Added Optimism Sepolia support");
            }
        }
    }

    /**
     * @notice Batch configure multiple chains at once
     */
    function batchConfigureChains(
        uint32[] memory chainIds,
        address[] memory contractAddresses
    ) public {
        require(
            chainIds.length == contractAddresses.length,
            "Array length mismatch"
        );

        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(crossBegAddress != address(0), "CrossBeg address not set");

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        vm.startBroadcast();
        crossBeg.setSupportedChains(chainIds, contractAddresses);
        vm.stopBroadcast();

        console.log("Batch configured", chainIds.length, "chains");
    }

    /**
     * @notice Update relayer address
     */
    function updateRelayer(address newRelayer) public {
        require(newRelayer != address(0), "Invalid relayer address");

        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(crossBegAddress != address(0), "CrossBeg address not set");

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        vm.startBroadcast();
        crossBeg.setRelayer(newRelayer);
        vm.stopBroadcast();

        console.log("Relayer updated to:", newRelayer);
    }

    /**
     * @notice Verify deployment by checking contract state
     */
    function verifyDeployment() public view {
        uint256 chainId = block.chainid;
        NetworkConfig memory config = networkConfigs[chainId];

        require(config.chainId != 0, "Unsupported testnet");
        require(config.isTestnet, "This script only supports testnets");

        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(crossBegAddress != address(0), "CrossBeg address not set");

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        console.log("=== Testnet Deployment Verification ===");
        console.log("Network:", config.name);
        console.log("Chain ID:", chainId);
        console.log("CrossBeg Address:", address(crossBeg));
        console.log("Local Chain ID:", crossBeg.localChainId());
        console.log("Owner:", crossBeg.owner());
        console.log("Relayer:", crossBeg.relayer());
        console.log("Next Request ID:", crossBeg.nextRequestId());

        (uint256 totalRequests, uint256 currentRequestId) = crossBeg
            .getContractStats();
        console.log("Total Requests:", totalRequests);
        console.log("Current Request ID:", currentRequestId);

        // Check supported testnet chains
        uint32[] memory testChains = new uint32[](6);
        testChains[0] = 11155111; // Ethereum Sepolia
        testChains[1] = 80002; // Polygon Amoy
        testChains[2] = 84532; // Base Sepolia
        testChains[3] = 421614; // Arbitrum Sepolia
        testChains[4] = 11155420; // Optimism Sepolia
        testChains[5] = 5003; // Mantle Sepolia

        bool[] memory supported = crossBeg.getSupportedChains(testChains);
        console.log("Supported testnet chains:");
        for (uint i = 0; i < testChains.length; i++) {
            console.log("  Chain", testChains[i], ":", supported[i]);
        }
        console.log("==============================");
    }

    /**
     * @notice Get gas quote for deployment
     */
    function getDeploymentGasQuote() public view returns (uint256) {
        uint256 chainId = block.chainid;
        NetworkConfig memory config = networkConfigs[chainId];

        require(config.chainId != 0, "Unsupported testnet");
        require(config.isTestnet, "This script only supports testnets");

        // Estimate gas for deployment (updated for new contract)
        uint256 estimatedGas = 3_800_000; // Approximate gas for CrossBeg deployment

        console.log("Estimated gas for testnet deployment:", estimatedGas);
        console.log("Network:", config.name);

        return estimatedGas;
    }

    /**
     * @notice Transfer ownership of deployed contract
     */
    function transferOwnership(address newOwner) public {
        require(newOwner != address(0), "Invalid new owner");

        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(crossBegAddress != address(0), "CrossBeg address not set");

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        vm.startBroadcast();
        crossBeg.transferOwnership(newOwner);
        vm.stopBroadcast();

        console.log("Ownership transferred to:", newOwner);
    }

    /**
     * @notice Emergency withdraw from contract
     */
    function emergencyWithdraw() public {
        address crossBegAddress = vm.envAddress("CROSSBEG_ADDRESS");
        require(crossBegAddress != address(0), "CrossBeg address not set");

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(crossBegAddress)
        );

        vm.startBroadcast();
        crossBeg.emergencyWithdraw();
        vm.stopBroadcast();

        console.log("Emergency withdrawal completed");
    }

    /**
     * @notice Save deployment information to console (file writing disabled due to permissions)
     */
    function _saveDeploymentInfo(
        uint256 chainId,
        address contractAddress,
        NetworkConfig memory config,
        address relayerAddress
    ) internal view {
        console.log("\n=== Deployment Info ===");
        console.log("Network:", config.name);
        console.log("Chain ID:", chainId);
        console.log("CrossBeg Address:", contractAddress);
        console.log("Relayer Address:", relayerAddress);
        console.log("Is Testnet:", config.isTestnet);
        console.log("Deployed At:", block.timestamp);
        console.log("Deployer Address:", msg.sender);
        console.log("=======================\n");

        // Log env variable format for easy copying
        string memory envVarName;
        if (chainId == 11155111) envVarName = "SEPOLIA_CROSSBEG";
        else if (chainId == 80002) envVarName = "POLYGON_AMOY_CROSSBEG";
        else if (chainId == 84532) envVarName = "BASE_SEPOLIA_CROSSBEG";
        else if (chainId == 421614) envVarName = "ARBITRUM_SEPOLIA_CROSSBEG";
        else if (chainId == 11155420) envVarName = "OPTIMISM_SEPOLIA_CROSSBEG";
        else if (chainId == 5003) envVarName = "MANTLE_SEPOLIA_CROSSBEG";

        if (bytes(envVarName).length > 0) {
            console.log("Add to .env file:");
            console.log(
                string(
                    abi.encodePacked(
                        envVarName,
                        "=",
                        vm.toString(contractAddress)
                    )
                )
            );
        }
    }

    /**
     * @notice Log deployment summary
     */
    function _logDeploymentSummary(
        NetworkConfig memory config,
        address contractAddress,
        address relayerAddress
    ) internal view {
        console.log("\n=== Deployment Summary ===");
        console.log("Network:", config.name);
        console.log("Chain ID:", config.chainId);
        console.log("CrossBeg Address:", contractAddress);
        console.log("Relayer Address:", relayerAddress);
        console.log("Is Testnet:", config.isTestnet);
        console.log("RPC URL:", config.rpcUrl);
        console.log("Deployer:", msg.sender);
        console.log("========================\n");
    }

    /**
     * @notice Get supported testnet networks
     */
    function getSupportedNetworks() public pure {
        console.log("=== Supported Testnet Networks ===");
        console.log("  11155111: Ethereum Sepolia");
        console.log("  80002: Polygon Amoy");
        console.log("  84532: Base Sepolia");
        console.log("  421614: Arbitrum Sepolia");
        console.log("  11155420: Optimism Sepolia");
        console.log("  5003: Mantle Sepolia");
        console.log("==================================");
    }

    /**
     * @notice Display environment template (instead of creating file)
     */
    function createEnvTemplate() public pure {
        console.log("=== Environment Template ===");
        console.log("Create a .env file with these variables:");
        console.log("");
        console.log("# CrossBeg Deployment Environment Variables");
        console.log("# Required");
        console.log("PRIVATE_KEY=0x...");
        console.log("RELAYER_ADDRESS=0x...");
        console.log("");
        console.log("# Testnet contract addresses (update after deployment)");
        console.log("SEPOLIA_CROSSBEG=0x...");
        console.log("BASE_SEPOLIA_CROSSBEG=0x...");
        console.log("MANTLE_SEPOLIA_CROSSBEG=0x...");
        console.log("POLYGON_AMOY_CROSSBEG=0x...");
        console.log("ARBITRUM_SEPOLIA_CROSSBEG=0x...");
        console.log("OPTIMISM_SEPOLIA_CROSSBEG=0x...");
        console.log("");
        console.log("# Optional RPC URLs");
        console.log("# SEPOLIA_RPC_URL=");
        console.log("# POLYGON_AMOY_RPC_URL=");
        console.log("# BASE_SEPOLIA_RPC_URL=");
        console.log("# ARBITRUM_SEPOLIA_RPC_URL=");
        console.log("# OPTIMISM_SEPOLIA_RPC_URL=");
        console.log("# MANTLE_SEPOLIA_RPC_URL=");
        console.log("============================");
    }
}
