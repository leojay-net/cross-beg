// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CrossBegPaymentRequest} from "../src/CrossBeg.sol";

/**
 * @title CrossBeg Chain Configuration Script
 * @notice Con        // Check all other chains
        for (uint i = 0; i < chains.length; i++) {
            if (chains[i].chainId != currentChainId) {
                bool isSupported = crossBeg.supportedChains(chains[i].chainId);
                string memory status = isSupported ? "SUPPORTED" : "NOT SUPPORTED";
                console.log(
                    string.concat(
                        chains[i].name,
                        " (",
                        vm.toString(chains[i].chainId),
                        "): ",
                        status
                    )
                );
            }
        }supported chains for all deployed CrossBeg contracts
 * @dev This script adds each chain as a supported target on all other chains
 */
contract ConfigureChainsScript is Script {
    // Chain configurations with deployed contract addresses
    struct ChainConfig {
        uint32 chainId;
        string name;
        address contractAddress;
    }

    // All deployed testnet contracts
    ChainConfig[] public chains;

    function setUp() public {
        // Add all deployed testnet contracts
        chains.push(
            ChainConfig({
                chainId: 11155111,
                name: "Ethereum Sepolia",
                contractAddress: vm.envAddress("SEPOLIA_CROSSBEG")
            })
        );

        chains.push(
            ChainConfig({
                chainId: 84532,
                name: "Base Sepolia",
                contractAddress: vm.envAddress("BASE_SEPOLIA_CROSSBEG")
            })
        );

        chains.push(
            ChainConfig({
                chainId: 11155420,
                name: "Optimism Sepolia",
                contractAddress: vm.envAddress("OPTIMISM_SEPOLIA_CROSSBEG")
            })
        );

        chains.push(
            ChainConfig({
                chainId: 5003,
                name: "Mantle Sepolia",
                contractAddress: vm.envAddress("MANTLE_SEPOLIA_CROSSBEG")
            })
        );

        chains.push(
            ChainConfig({
                chainId: 80002,
                name: "Polygon Amoy",
                contractAddress: vm.envAddress("POLYGON_AMOY_CROSSBEG")
            })
        );

        chains.push(
            ChainConfig({
                chainId: 421614,
                name: "Arbitrum Sepolia",
                contractAddress: vm.envAddress("ARBITRUM_SEPOLIA_CROSSBEG")
            })
        );
    }

    /**
     * @notice Configure all chains to support each other
     * @dev This will run on each chain and add all other chains as supported targets
     */
    function run() public {
        uint256 currentChainId = block.chainid;
        console.log("Configuring supported chains for chain ID:", currentChainId);

        // Find current chain config
        ChainConfig memory currentChain;
        bool found = false;

        for (uint256 i = 0; i < chains.length; i++) {
            if (chains[i].chainId == currentChainId) {
                currentChain = chains[i];
                found = true;
                break;
            }
        }

        require(found, "Current chain not found in configuration");
        require(
            currentChain.contractAddress != address(0),
            "Contract address not set for current chain"
        );

        console.log("Current chain:", currentChain.name);
        console.log("Contract address:", currentChain.contractAddress);

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(currentChain.contractAddress)
        );

        // Prepare arrays for batch configuration
        uint32[] memory targetChainIds = new uint32[](chains.length - 1);
        address[] memory targetContracts = new address[](chains.length - 1);
        uint256 index = 0;

        // Add all other chains as supported targets
        for (uint256 i = 0; i < chains.length; i++) {
            if (
                chains[i].chainId != currentChainId &&
                chains[i].contractAddress != address(0)
            ) {
                targetChainIds[index] = chains[i].chainId;
                targetContracts[index] = chains[i].contractAddress;
                console.log("Adding support for:", chains[i].name, "Chain ID:", chains[i].chainId);
                index++;
            }
        }

        // Resize arrays to actual size
        uint32[] memory finalChainIds = new uint32[](index);
        address[] memory finalContracts = new address[](index);

        for (uint256 i = 0; i < index; i++) {
            finalChainIds[i] = targetChainIds[i];
            finalContracts[i] = targetContracts[i];
        }

        // Execute the configuration
        vm.startBroadcast();
        
        try crossBeg.setSupportedChains(finalChainIds, finalContracts) {
            console.log("Successfully configured", index, "supported chains for", currentChain.name);
        } catch Error(string memory reason) {
            console.log("Failed to configure chains. Reason:", reason);
            // Try individual chain configuration as fallback
            console.log("Attempting individual chain configuration...");
            
            for (uint256 i = 0; i < finalChainIds.length; i++) {
                try crossBeg.addSupportedChain(finalChainIds[i], finalContracts[i]) {
                    console.log("Successfully added chain:", finalChainIds[i]);
                } catch Error(string memory addReason) {
                    console.log("Failed to add chain:", finalChainIds[i], "Reason:", addReason);
                }
            }
        }
        
        vm.stopBroadcast();
    }

    /**
     * @notice Configure a specific chain manually
     * @param targetChainId The chain ID to configure
     */
    function configureSpecificChain(uint32 targetChainId) public {
        uint256 currentChainId = block.chainid;
        console.log("Configuring chain", targetChainId, "on current chain", currentChainId);

        // Find current chain and target chain configs
        ChainConfig memory currentChain;
        ChainConfig memory targetChain;
        bool currentFound = false;
        bool targetFound = false;

        for (uint256 i = 0; i < chains.length; i++) {
            if (chains[i].chainId == currentChainId) {
                currentChain = chains[i];
                currentFound = true;
            }
            if (chains[i].chainId == targetChainId) {
                targetChain = chains[i];
                targetFound = true;
            }
        }

        require(currentFound, "Current chain not found");
        require(targetFound, "Target chain not found");
        require(
            currentChain.contractAddress != address(0),
            "Current chain contract not set"
        );
        require(
            targetChain.contractAddress != address(0),
            "Target chain contract not set"
        );

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(currentChain.contractAddress)
        );

        vm.startBroadcast();
        
        try crossBeg.addSupportedChain(targetChain.chainId, targetChain.contractAddress) {
            console.log("Added support for", targetChain.name, "on", currentChain.name);
        } catch Error(string memory reason) {
            console.log("Failed to add support. Reason:", reason);
        }
        
        vm.stopBroadcast();
    }

    /**
     * @notice Check which chains are currently supported
     */
    function checkSupportedChains() public view {
        uint256 currentChainId = block.chainid;

        // Find current chain config
        ChainConfig memory currentChain;
        bool found = false;

        for (uint256 i = 0; i < chains.length; i++) {
            if (chains[i].chainId == currentChainId) {
                currentChain = chains[i];
                found = true;
                break;
            }
        }

        require(found, "Current chain not found");
        require(
            currentChain.contractAddress != address(0),
            "Contract address not set"
        );

        CrossBegPaymentRequest crossBeg = CrossBegPaymentRequest(
            payable(currentChain.contractAddress)
        );

        console.log("Checking supported chains for:", currentChain.name);
        console.log("Contract address:", currentChain.contractAddress);

        // Check all other chains
        for (uint i = 0; i < chains.length; i++) {
            if (chains[i].chainId != currentChainId) {
                bool isSupported = crossBeg.supportedChains(chains[i].chainId);
                console.log(chains[i].name);
                string memory statusStr = isSupported ? "SUPPORTED" : "NOT SUPPORTED";
                string memory msgStr = string(
                    abi.encodePacked(
                        "(",
                        vm.toString(chains[i].chainId),
                        "): ",
                        statusStr
                    )
                );
                console.log(msgStr);
            }
        }
    }

    /**
     * @notice Get all chain configurations
     */
    function getAllChainConfigs() public view returns (ChainConfig[] memory) {
        return chains;
    }

    /**
     * @notice Get current chain configuration
     */
    function getCurrentChainConfig() public view returns (ChainConfig memory currentChain, bool found) {
        uint256 currentChainId = block.chainid;
        
        for (uint256 i = 0; i < chains.length; i++) {
            if (chains[i].chainId == currentChainId) {
                return (chains[i], true);
            }
        }
        
        return (currentChain, false);
    }
}
