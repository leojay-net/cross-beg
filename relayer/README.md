# CrossBeg Relayer

A modular, production-ready relayer service for the CrossBeg cross-chain payment request system. This relayer handles message delivery between supported blockchain networks, provides real-time cross-chain message visibility, and offers a comprehensive API with WebSocket support for monitoring and management.

## ✨ Key Features

- **Cross-Chain Message Visibility**: Users can see payment requests from all supported chains regardless of which chain they're connected to
- **Real-Time Updates**: WebSocket support for live message status updates
- **Priority Queue Management**: Enhanced queue system with chain-specific processing and priority handling
- **Comprehensive Indexing**: Events from all chains are indexed and aggregated for unified user experience
- **Chain-Agnostic API**: API endpoints that work across all supported chains
- **Database Persistence**: SQLite database ensures data survives restarts and page refreshes
- **User Session Management**: Persistent user sessions with targeted notifications
- **Automatic Cleanup**: Periodic cleanup of old data and expired messages

## 🏗️ Architecture

The relayer is built with a modular architecture for maintainability, scalability, and testability:

```
relayer/
├── src/
│   ├── api/                    # Express API layer
│   │   ├── middleware/         # Request middleware
│   │   └── routes/            # API route handlers
│   ├── blockchain/            # Blockchain interaction layer
│   ├── config/               # Configuration management
│   ├── events/               # Event listening and indexing
│   ├── relay/                # Message relay processing
│   ├── utils/                # Utilities and helpers
│   ├── CrossBegRelayer.js    # Main orchestrator class
│   └── index.js              # Application entry point
├── logs/                     # Application logs
├── package.json
└── env.example              # Environment variables template
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- NPM or Yarn
- Access to supported blockchain RPC endpoints
- Private key for relayer wallet

### Installation

1. **Clone and setup:**
```bash
cd relayer
npm install
```

2. **Configure environment:**
```bash
cp env.example .env
# Edit .env with your configuration
```

3. **Start the relayer:**
```bash
# Development
npm run dev

# Production
npm start
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` |
| `RELAYER_PRIVATE_KEY` | Private key for relayer wallet | Required |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window (seconds) | `900` |
| `MAX_RETRY_ATTEMPTS` | Max retry attempts for failed relays | `3` |
| `RETRY_DELAY` | Base retry delay (ms) | `5000` |
| `INDEXER_INTERVAL` | Event indexing interval (ms) | `30000` |
| `INDEXER_BATCH_SIZE` | Events per indexing batch | `1000` |
| `HISTORICAL_BLOCKS_LIMIT` | Max historical blocks to index | `10000` |

### Supported Chains

The relayer supports the following testnets:

- **Sepolia** (Chain ID: 11155111)
- **Base Sepolia** (Chain ID: 84532) 
- **Optimism Sepolia** (Chain ID: 11155420)
- **Mantle Sepolia** (Chain ID: 5003)
- **Polygon Amoy** (Chain ID: 80002)
- **Arbitrum Sepolia** (Chain ID: 421614)

Configure RPC URLs and contract addresses via environment variables.

## 📡 API Reference

### Health Endpoints

- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system status
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/live` - Kubernetes liveness probe

### Message Endpoints

- `GET /messages/user/:address` - Get user's messages
- `GET /messages/pending/:address` - Get pending requests for user
- `GET /messages/request/:id` - Get specific request details
- `GET /messages/search` - Search messages with filters
- `GET /messages/export/:address` - Export user data (JSON/CSV)
- `POST /messages/relay/:id` - Manually relay a message

### Admin Endpoints

- `GET /admin/stats` - Comprehensive system statistics
- `GET /admin/chains` - Supported chains status
- `GET /admin/wallets` - Wallet balances
- `GET /admin/queue` - Message queue status
- `GET /admin/analytics` - Analytics data
- `GET /admin/metrics` - System metrics
- `POST /admin/chains/:key/refresh` - Refresh chain connection

## 🔧 Module Overview

### Core Modules

#### `CrossBegRelayer.js`
Main orchestrator class that coordinates all components and provides a unified interface.

#### `blockchain/ProviderManager.js`
- Manages blockchain providers and wallets
- Handles contract initialization
- Monitors wallet balances
- Provides network information

#### `events/EventListener.js`
- Sets up blockchain event listeners
- Processes incoming events
- Queues messages for relay
- Handles event parsing and validation

#### `events/MessageIndexer.js`
- Indexes all blockchain events
- Provides message search and filtering
- Generates analytics data
- Manages historical event processing

#### `relay/MessageQueue.js`
- Manages message queuing system
- Handles retry logic
- Provides queue statistics
- Implements priority processing

#### `relay/MessageRelay.js`
- Processes cross-chain message delivery
- Handles gas estimation and optimization
- Manages transaction retries
- Provides relay cost estimation

### Configuration Modules

#### `config/chains.js`
Chain configuration management with helper functions for chain lookups and validation.

#### `config/constants.js`
Contract ABIs, enums, default values, and system constants.

### API Modules

#### `api/middleware/index.js`
Express middleware including rate limiting, CORS, security headers, request logging, and error handling.

#### `api/routes/`
Modular route handlers:
- `health.js` - Health and status endpoints
- `messages.js` - Message-related endpoints  
- `admin.js` - Administrative endpoints

### Utilities

#### `utils/logger.js`
Winston-based logging with structured logging, file rotation, and specialized logging methods.

## 🔍 Monitoring & Observability

### Logging

The relayer provides structured logging with multiple transports:

- **Console**: Colored, human-readable logs for development
- **Files**: JSON-structured logs with rotation
  - `logs/combined.log` - All logs
  - `logs/error.log` - Error logs only
  - `logs/debug.log` - Debug logs (development)

### Metrics

Access system metrics via `/admin/metrics`:

- Process information (memory, CPU, uptime)
- Relayer statistics (messages processed, success rates)
- Queue status and performance
- Chain-specific metrics

### Health Checks

Multiple health check endpoints for different monitoring needs:

- `/health` - Basic health status
- `/health/detailed` - Comprehensive system status
- `/health/ready` - Readiness for traffic
- `/health/live` - Process liveness

## 📡 Cross-Chain API Endpoints

### Enhanced Message Endpoints

#### Get User Messages (Cross-Chain Aware)
```
GET /messages/user/:userAddress?includeAllChains=true&crossChainOnly=false
```
Returns all messages for a user across all supported chains with enhanced cross-chain context.

#### Cross-Chain Message Discovery
```
GET /messages/cross-chain/:userAddress?userConnectedChainId=80002
```
Categorizes messages based on the user's currently connected chain, showing:
- Messages from other chains to current chain
- Messages from current chain to other chains
- Cross-chain statistics and distribution

#### Enhanced Pending Requests
```
GET /messages/pending/:userAddress?userConnectedChainId=80002
```
Shows pending requests with context about cross-chain visibility.

### WebSocket Real-Time Updates

Connect to WebSocket at `ws://localhost:3001` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

// Subscribe to user-specific updates
ws.send(JSON.stringify({
    type: 'subscribe_user',
    userAddress: '0x...'
}));

// Subscribe to chain-specific updates
ws.send(JSON.stringify({
    type: 'subscribe_chain',
    chainId: 80002
}));

// Receive real-time updates
ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    console.log('Update:', update);
};
```

### Update Types

- `message_sent` - New cross-chain message sent
- `message_received` - Message delivered to target chain
- `message_fulfilled` - Payment request fulfilled
- `message_cancelled` - Payment request cancelled

### WebSocket Session Management

The relayer now supports persistent user sessions:

```javascript
const ws = new WebSocket('ws://localhost:3001');

// Create a session
ws.send(JSON.stringify({
    type: 'create_session',
    userAddress: '0x...',
    chainId: 80002
}));

// Subscribe to user updates
ws.send(JSON.stringify({
    type: 'subscribe_user',
    userAddress: '0x...'
}));

// Keep session alive
setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
}, 30000);
```

## 🗄️ Database Persistence

The relayer uses SQLite for persistent storage, ensuring data survives restarts and user page refreshes.

### Database Structure

- **message_queue**: Persistent message queues with priority and retry logic
- **indexed_messages**: Cross-chain message aggregation and status tracking
- **message_events**: Individual blockchain events with full context
- **user_sessions**: WebSocket sessions and user subscriptions
- **system_state**: Block numbers and system configuration
- **chain_stats**: Per-chain processing statistics

### Data Persistence Benefits

- **Queue Survival**: Message queues persist across relayer restarts
- **User State**: Users don't lose their message history on page refresh
- **Cross-Chain Context**: Full message lifecycle tracking across all chains
- **Session Management**: WebSocket subscriptions survive temporary disconnections
- **Analytics**: Historical data for system monitoring and debugging

### Database Configuration

```bash
# Database path (default: ./data/relayer.db)
DATABASE_PATH=./data/relayer.db

# Cleanup intervals
DATABASE_CLEANUP_INTERVAL=21600000  # 6 hours in ms
SESSION_CLEANUP_INTERVAL=86400      # 24 hours in seconds
```

### Backup and Maintenance

```bash
# Database is automatically cleaned up periodically
# Manual cleanup can be triggered via admin API
curl -X POST http://localhost:3001/admin/cleanup

# Database statistics
curl http://localhost:3001/admin/database/stats
```

## 🛠️ Development

### Project Structure

```
src/
├── api/                    # API layer
│   ├── middleware/         # Express middleware
│   └── routes/            # Route handlers
├── blockchain/            # Blockchain interaction
│   └── ProviderManager.js # Provider & wallet management
├── config/               # Configuration
│   ├── chains.js         # Chain configurations
│   └── constants.js      # System constants
├── events/               # Event processing
│   ├── EventListener.js  # Blockchain event listeners
│   └── MessageIndexer.js # Event indexing & search
├── relay/                # Message relay
│   ├── MessageQueue.js   # Queue management
│   └── MessageRelay.js   # Relay processing
├── utils/                # Utilities
│   └── logger.js         # Logging utility
├── CrossBegRelayer.js    # Main orchestrator
└── index.js              # Application entry point
```

### Adding New Chains

1. Update `config/chains.js` with new chain configuration
2. Add environment variables for RPC URL and contract address
3. The system will automatically initialize providers and contracts

### Extending Functionality

The modular architecture makes it easy to extend:

- **New API endpoints**: Add routes in `api/routes/`
- **Custom middleware**: Add to `api/middleware/`
- **Additional events**: Extend `events/EventListener.js`
- **New analytics**: Enhance `events/MessageIndexer.js`

### Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

## 🚨 Production Deployment

### Environment Setup

1. **Set production environment:**
```bash
export NODE_ENV=production
```

2. **Configure logging:**
- Logs are automatically configured for production
- Use external log aggregation (ELK, Splunk, etc.)

3. **Resource requirements:**
- **Memory**: 512MB minimum, 1GB recommended
- **CPU**: 1 core minimum, 2 cores recommended
- **Storage**: 10GB for logs and data

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crossbeg-relayer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crossbeg-relayer
  template:
    metadata:
      labels:
        app: crossbeg-relayer
    spec:
      containers:
      - name: relayer
        image: crossbeg/relayer:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Monitoring Setup

1. **Prometheus metrics** (via `/admin/metrics`)
2. **Log aggregation** (structured JSON logs)
3. **Alerting** on health check failures
4. **Dashboard** for key metrics

## 🔒 Security

### Best Practices

- **Private Keys**: Use secure key management (AWS KMS, HashiCorp Vault)
- **Rate Limiting**: Configured to prevent abuse
- **CORS**: Properly configured for your domain
- **Helmet**: Security headers enabled
- **Input Validation**: All inputs validated and sanitized

### Wallet Security

- Use dedicated relayer wallets with minimal required funds
- Monitor wallet balances and set up alerts
- Implement key rotation procedures
- Use hardware security modules in production

## 📈 Performance

### Optimization Features

- **Concurrent Processing**: Multiple chains processed in parallel
- **Intelligent Queuing**: Priority-based message processing
- **Gas Optimization**: Dynamic gas price adjustment
- **Connection Pooling**: Efficient RPC connection management
- **Caching**: Event and data caching for performance

### Scaling Considerations

- **Horizontal Scaling**: Multiple relayer instances can run in parallel
- **Load Balancing**: API endpoints support load balancing
- **Database**: Consider external database for large-scale deployments
- **Message Queues**: External queue systems for high throughput

## 🐛 Troubleshooting

### Common Issues

1. **RPC Connection Errors**
   - Check RPC endpoint availability
   - Verify API keys and rate limits
   - Monitor network connectivity

2. **Transaction Failures**
   - Check wallet balance
   - Verify gas price settings
   - Monitor network congestion

3. **Event Indexing Delays**
   - Check RPC response times
   - Adjust batch sizes
   - Monitor block processing

### Debug Mode

```bash
LOG_LEVEL=debug npm start
```

### Health Checks

Monitor these endpoints for system health:
- `/health/detailed` - Comprehensive status
- `/admin/queue` - Queue status
- `/admin/wallets` - Wallet balances

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting guide
- Review the API documentation 