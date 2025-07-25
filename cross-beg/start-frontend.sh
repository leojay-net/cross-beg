#!/bin/bash

echo "🚀 Starting CrossBeg Frontend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Creating .env file with default values..."
    cat > .env << EOF
# Privy Configuration - Replace with your actual App ID
VITE_PRIVY_APP_ID=your-privy-app-id-here

# Relayer Configuration
VITE_RELAYER_URL=http://localhost:3001
EOF
    echo "📝 Please update .env file with your Privy App ID from https://privy.io"
fi

# Start the development server
npm run dev 