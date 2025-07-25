#!/bin/bash

echo "🚀 Starting CrossBeg Relayer..."

# Set environment variables and start the relayer using npm start
# npm start will automatically check and rebuild better-sqlite3 if needed
PORT=3001 \
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com \
RELAYER_PRIVATE_KEY=0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
npm start 