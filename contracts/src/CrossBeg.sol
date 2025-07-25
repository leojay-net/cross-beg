// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title CrossBeg Payment Request Contract - Custom Relayer Pattern
 * @notice Handles cross-chain payment requests using custom relayer messaging
 * @dev This contract manages payment requests and cross-chain messaging via events
 * Identity resolution is handled off-chain via ENS API
 */
contract CrossBegPaymentRequest {
    // Events
    event PaymentRequestCreated(
        uint256 indexed requestId,
        address indexed requester,
        address indexed target,
        uint256 amount,
        string token,
        uint32 targetChain,
        string message,
        uint256 timestamp,
        uint256 expiryTime
    );

    event PaymentRequestReceived(
        uint256 indexed requestId,
        address indexed requester,
        address indexed target,
        uint256 amount,
        string token,
        uint32 originChain,
        string message,
        uint256 timestamp,
        uint256 expiryTime,
        MessageStatus status
    );

    event PaymentRequestFulfilled(
        uint256 indexed requestId,
        address indexed payer,
        uint256 amount,
        string token,
        string txHash
    );

    event PaymentRequestCancelled(
        uint256 indexed requestId,
        address indexed requester
    );

    event MessageStatusUpdated(
        uint256 indexed requestId,
        MessageStatus oldStatus,
        MessageStatus newStatus
    );

    // Cross-chain messaging events for relayer
    event CrossChainMessageSent(
        uint256 indexed requestId,
        address indexed requester,
        address indexed target,
        uint32 targetChain,
        uint256 amount,
        string token,
        string message,
        uint256 expiryTime,
        bytes32 messageHash
    );

    event CrossChainMessageDelivered(
        uint256 indexed requestId,
        uint32 originChain,
        bytes32 messageHash,
        MessageStatus status
    );

    // Structs
    struct PaymentRequest {
        uint256 id;
        address requester;
        address target;
        uint256 amount;
        string token; // Token symbol or address
        uint32 originChain;
        uint32 targetChain;
        string message;
        RequestStatus status;
        MessageStatus messageStatus; // For cross-chain delivery tracking
        uint256 timestamp;
        uint256 expiryTime;
        string fulfillmentTxHash; // Transaction hash when fulfilled
        bytes32 messageHash; // Hash for cross-chain message verification
    }

    enum RequestStatus {
        Pending,
        Fulfilled,
        Cancelled,
        Expired
    }

    enum MessageStatus {
        Local, // Local request (same chain)
        Sent, // Cross-chain message sent, waiting for delivery
        Delivered, // Message delivered to target chain, pending approval
        Failed // Message delivery failed
    }

    // State variables
    uint32 public immutable localChainId;
    address public owner;
    address public relayer; // Authorized relayer address

    mapping(uint256 => PaymentRequest) public paymentRequests;
    mapping(address => uint256[]) public userSentRequests; // User's sent request IDs
    mapping(address => uint256[]) public userReceivedRequests; // Requests received by user
    mapping(uint32 => bool) public supportedChains; // Supported chain IDs
    mapping(uint32 => address) public remoteCrossBegContracts; // Chain ID -> Contract address
    mapping(bytes32 => bool) public processedMessages; // Prevent replay attacks

    uint256 public nextRequestId;
    uint256 public constant DEFAULT_EXPIRY_TIME = 7 days;
    uint256 public constant MIN_EXPIRY_TIME = 1 hours;
    uint256 public constant MAX_EXPIRY_TIME = 30 days;

    // Access control
    modifier onlyOwner() {
        require(msg.sender == owner, "CrossBeg: not owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "CrossBeg: not authorized relayer");
        _;
    }

    modifier onlyValidChain(uint32 chainId) {
        require(supportedChains[chainId], "CrossBeg: chain not supported");
        _;
    }

    modifier requestExists(uint256 requestId) {
        require(
            paymentRequests[requestId].id != 0,
            "CrossBeg: request does not exist"
        );
        _;
    }

    constructor(uint32 _localChainId, address _relayer) {
        localChainId = _localChainId;
        owner = msg.sender;
        relayer = _relayer;
        nextRequestId = 1;

        // Add local chain as supported
        supportedChains[_localChainId] = true;
    }

    /**
     * @notice Transfer ownership of the contract
     * @param newOwner The new owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "CrossBeg: invalid new owner");
        owner = newOwner;
    }

    /**
     * @notice Set authorized relayer address
     * @param newRelayer The new relayer address
     */
    function setRelayer(address newRelayer) external onlyOwner {
        require(newRelayer != address(0), "CrossBeg: invalid relayer");
        relayer = newRelayer;
    }

    /**
     * @notice Add support for a new chain
     * @param chainId The chain ID to add
     * @param contractAddress The contract address on that chain
     */
    function addSupportedChain(
        uint32 chainId,
        address contractAddress
    ) external onlyOwner {
        require(
            contractAddress != address(0),
            "CrossBeg: invalid contract address"
        );
        supportedChains[chainId] = true;
        remoteCrossBegContracts[chainId] = contractAddress;
    }

    /**
     * @notice Remove support for a chain
     * @param chainId The chain ID to remove
     */
    function removeSupportedChain(uint32 chainId) external onlyOwner {
        require(chainId != localChainId, "CrossBeg: cannot remove local chain");
        supportedChains[chainId] = false;
        delete remoteCrossBegContracts[chainId];
    }

    /**
     * @notice Set multiple supported chains at once
     * @param chainIds Array of chain IDs
     * @param contractAddresses Array of contract addresses
     */
    function setSupportedChains(
        uint32[] calldata chainIds,
        address[] calldata contractAddresses
    ) external onlyOwner {
        require(
            chainIds.length == contractAddresses.length,
            "CrossBeg: length mismatch"
        );

        for (uint256 i = 0; i < chainIds.length; i++) {
            require(
                contractAddresses[i] != address(0),
                "CrossBeg: invalid contract address"
            );
            supportedChains[chainIds[i]] = true;
            remoteCrossBegContracts[chainIds[i]] = contractAddresses[i];
        }
    }

    /**
     * @notice Create a payment request (local or cross-chain)
     * @param target The address to request payment from
     * @param amount The amount requested
     * @param token The token symbol or address
     * @param targetChain The chain where the target user is located
     * @param message Optional message with the request
     * @param expiryTime Custom expiry time (0 for default)
     */
    function createPaymentRequest(
        address target,
        uint256 amount,
        string memory token,
        uint32 targetChain,
        string memory message,
        uint256 expiryTime
    ) external returns (uint256) {
        _validateRequestInputs(target, amount, token, targetChain);

        uint256 finalExpiryTime = _calculateExpiryTime(expiryTime);
        uint256 requestId = nextRequestId++;

        bytes32 messageHash = _createMessageHash(
            requestId,
            msg.sender,
            target,
            amount,
            token,
            targetChain,
            message,
            finalExpiryTime
        );

        _storePaymentRequest(
            requestId,
            target,
            amount,
            token,
            targetChain,
            message,
            finalExpiryTime,
            messageHash
        );

        emit PaymentRequestCreated(
            requestId,
            msg.sender,
            target,
            amount,
            token,
            targetChain,
            message,
            block.timestamp,
            finalExpiryTime
        );

        _handleRequestType(
            requestId,
            target,
            targetChain,
            amount,
            token,
            message,
            finalExpiryTime,
            messageHash
        );

        return requestId;
    }

    /**
     * @notice Validate inputs for payment request creation
     */
    function _validateRequestInputs(
        address target,
        uint256 amount,
        string memory token,
        uint32 targetChain
    ) internal view {
        require(target != address(0), "CrossBeg: invalid target address");
        require(amount > 0, "CrossBeg: amount must be greater than zero");
        require(target != msg.sender, "CrossBeg: cannot request from yourself");
        require(bytes(token).length > 0, "CrossBeg: token cannot be empty");
        require(
            supportedChains[targetChain],
            "CrossBeg: target chain not supported"
        );
    }

    /**
     * @notice Calculate final expiry time
     */
    function _calculateExpiryTime(
        uint256 expiryTime
    ) internal view returns (uint256) {
        if (expiryTime == 0) {
            return block.timestamp + DEFAULT_EXPIRY_TIME;
        } else {
            require(
                expiryTime >= MIN_EXPIRY_TIME && expiryTime <= MAX_EXPIRY_TIME,
                "CrossBeg: invalid expiry time"
            );
            return block.timestamp + expiryTime;
        }
    }

    /**
     * @notice Create message hash for verification
     */
    function _createMessageHash(
        uint256 requestId,
        address requester,
        address target,
        uint256 amount,
        string memory token,
        uint32 targetChain,
        string memory message,
        uint256 finalExpiryTime
    ) internal view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    requestId,
                    requester,
                    target,
                    amount,
                    token,
                    localChainId,
                    targetChain,
                    message,
                    finalExpiryTime,
                    block.timestamp
                )
            );
    }

    /**
     * @notice Store payment request in storage
     */
    function _storePaymentRequest(
        uint256 requestId,
        address target,
        uint256 amount,
        string memory token,
        uint32 targetChain,
        string memory message,
        uint256 finalExpiryTime,
        bytes32 messageHash
    ) internal {
        PaymentRequest storage request = paymentRequests[requestId];
        request.id = requestId;
        request.requester = msg.sender;
        request.target = target;
        request.amount = amount;
        request.token = token;
        request.originChain = localChainId;
        request.targetChain = targetChain;
        request.message = message;
        request.status = RequestStatus.Pending;
        request.timestamp = block.timestamp;
        request.expiryTime = finalExpiryTime;
        request.messageHash = messageHash;

        // Add to user's sent requests
        userSentRequests[msg.sender].push(requestId);
    }

    /**
     * @notice Handle local vs cross-chain request logic
     */
    function _handleRequestType(
        uint256 requestId,
        address target,
        uint32 targetChain,
        uint256 amount,
        string memory token,
        string memory message,
        uint256 finalExpiryTime,
        bytes32 messageHash
    ) internal {
        PaymentRequest storage request = paymentRequests[requestId];

        if (targetChain != localChainId) {
            // Cross-chain request - emit event for relayer to pick up
            request.messageStatus = MessageStatus.Sent;

            emit CrossChainMessageSent(
                requestId,
                msg.sender,
                target,
                targetChain,
                amount,
                token,
                message,
                finalExpiryTime,
                messageHash
            );
        } else {
            // Local request
            request.messageStatus = MessageStatus.Local;
            userReceivedRequests[target].push(requestId);
        }
    }

    /**
     * @notice Receive cross-chain message (called by relayer)
     * @dev This function is called by the authorized relayer when delivering a message from another chain
     */
    function receiveMessage(
        uint256 requestId,
        address requester,
        address target,
        uint256 amount,
        string memory token,
        uint32 originChain,
        string memory message,
        uint256 timestamp,
        uint256 expiryTime,
        bytes32 messageHash
    ) external onlyRelayer {
        _validateIncomingMessage(originChain, expiryTime, messageHash);
        _verifyMessageHash(
            requestId,
            requester,
            target,
            amount,
            token,
            originChain,
            message,
            timestamp,
            expiryTime,
            messageHash
        );

        // Mark message as processed to prevent replay
        processedMessages[messageHash] = true;

        _createReceivedRequest(
            requestId,
            requester,
            target,
            amount,
            token,
            originChain,
            message,
            timestamp,
            expiryTime,
            messageHash
        );

        emit PaymentRequestReceived(
            requestId,
            requester,
            target,
            amount,
            token,
            originChain,
            message,
            timestamp,
            expiryTime,
            MessageStatus.Delivered
        );

        emit CrossChainMessageDelivered(
            requestId,
            originChain,
            messageHash,
            MessageStatus.Delivered
        );
    }

    /**
     * @notice Validate incoming cross-chain message
     */
    function _validateIncomingMessage(
        uint32 originChain,
        uint256 expiryTime,
        bytes32 messageHash
    ) internal view {
        require(
            supportedChains[originChain],
            "CrossBeg: origin chain not supported"
        );
        require(block.timestamp < expiryTime, "CrossBeg: request expired");
        require(
            !processedMessages[messageHash],
            "CrossBeg: message already processed"
        );
    }

    /**
     * @notice Verify message hash integrity
     */
    function _verifyMessageHash(
        uint256 requestId,
        address requester,
        address target,
        uint256 amount,
        string memory token,
        uint32 originChain,
        string memory message,
        uint256 timestamp,
        uint256 expiryTime,
        bytes32 messageHash
    ) internal view {
        bytes32 expectedHash = keccak256(
            abi.encodePacked(
                requestId,
                requester,
                target,
                amount,
                token,
                originChain,
                localChainId,
                message,
                expiryTime,
                timestamp
            )
        );
        require(messageHash == expectedHash, "CrossBeg: invalid message hash");
    }

    /**
     * @notice Create received request in storage
     */
    function _createReceivedRequest(
        uint256 requestId,
        address requester,
        address target,
        uint256 amount,
        string memory token,
        uint32 originChain,
        string memory message,
        uint256 timestamp,
        uint256 expiryTime,
        bytes32 messageHash
    ) internal {
        PaymentRequest storage request = paymentRequests[requestId];
        request.id = requestId;
        request.requester = requester;
        request.target = target;
        request.amount = amount;
        request.token = token;
        request.originChain = originChain;
        request.targetChain = localChainId;
        request.message = message;
        request.status = RequestStatus.Pending;
        request.messageStatus = MessageStatus.Delivered;
        request.timestamp = timestamp;
        request.expiryTime = expiryTime;
        request.messageHash = messageHash;

        // Add to target's received requests
        userReceivedRequests[target].push(requestId);
    }

    /**
     * @notice Update message delivery status (called by relayer)
     * @param requestId The request ID
     * @param newStatus The new message status
     */
    function updateMessageStatus(
        uint256 requestId,
        MessageStatus newStatus
    ) external onlyRelayer requestExists(requestId) {
        PaymentRequest storage request = paymentRequests[requestId];
        MessageStatus oldStatus = request.messageStatus;
        request.messageStatus = newStatus;

        emit MessageStatusUpdated(requestId, oldStatus, newStatus);
    }

    /**
     * @notice Fulfill a payment request (mark as paid)
     * @param requestId The request ID to fulfill
     * @param txHash The transaction hash of the payment
     */
    function fulfillPaymentRequest(
        uint256 requestId,
        string memory txHash
    ) external requestExists(requestId) {
        PaymentRequest storage request = paymentRequests[requestId];
        require(
            request.target == msg.sender,
            "CrossBeg: not the target of this request"
        );
        require(
            request.status == RequestStatus.Pending,
            "CrossBeg: request not pending"
        );
        require(
            block.timestamp < request.expiryTime,
            "CrossBeg: request expired"
        );
        require(
            bytes(txHash).length > 0,
            "CrossBeg: transaction hash required"
        );

        request.status = RequestStatus.Fulfilled;
        request.fulfillmentTxHash = txHash;

        emit PaymentRequestFulfilled(
            requestId,
            msg.sender,
            request.amount,
            request.token,
            txHash
        );
    }

    /**
     * @notice Cancel a payment request
     * @param requestId The request ID to cancel
     */
    function cancelPaymentRequest(
        uint256 requestId
    ) external requestExists(requestId) {
        PaymentRequest storage request = paymentRequests[requestId];
        require(request.requester == msg.sender, "CrossBeg: not the requester");
        require(
            request.status == RequestStatus.Pending,
            "CrossBeg: request not pending"
        );

        request.status = RequestStatus.Cancelled;

        emit PaymentRequestCancelled(requestId, msg.sender);
    }

    /**
     * @notice Mark expired requests as expired (anyone can call)
     * @param requestIds Array of request IDs to check
     */
    function markExpiredRequests(uint256[] calldata requestIds) external {
        for (uint256 i = 0; i < requestIds.length; i++) {
            PaymentRequest storage request = paymentRequests[requestIds[i]];
            if (
                request.id != 0 &&
                request.status == RequestStatus.Pending &&
                block.timestamp >= request.expiryTime
            ) {
                request.status = RequestStatus.Expired;
            }
        }
    }

    /**
     * @notice Get user's sent requests
     * @param user The user address
     * @return Array of request IDs
     */
    function getUserSentRequests(
        address user
    ) external view returns (uint256[] memory) {
        return userSentRequests[user];
    }

    /**
     * @notice Get user's received requests
     * @param user The user address
     * @return Array of request IDs
     */
    function getUserReceivedRequests(
        address user
    ) external view returns (uint256[] memory) {
        return userReceivedRequests[user];
    }

    /**
     * @notice Get payment request details
     * @param requestId The request ID
     * @return The payment request struct
     */
    function getPaymentRequest(
        uint256 requestId
    ) external view requestExists(requestId) returns (PaymentRequest memory) {
        return paymentRequests[requestId];
    }

    /**
     * @notice Get multiple payment requests
     * @param requestIds Array of request IDs
     * @return Array of payment request structs
     */
    function getPaymentRequests(
        uint256[] calldata requestIds
    ) external view returns (PaymentRequest[] memory) {
        PaymentRequest[] memory requests = new PaymentRequest[](
            requestIds.length
        );
        for (uint256 i = 0; i < requestIds.length; i++) {
            requests[i] = paymentRequests[requestIds[i]];
        }
        return requests;
    }

    /**
     * @notice Get supported chains
     * @param chainIds Array of chain IDs to check
     * @return Array of boolean values indicating support
     */
    function getSupportedChains(
        uint32[] calldata chainIds
    ) external view returns (bool[] memory) {
        bool[] memory supported = new bool[](chainIds.length);
        for (uint256 i = 0; i < chainIds.length; i++) {
            supported[i] = supportedChains[chainIds[i]];
        }
        return supported;
    }

    /**
     * @notice Emergency function to withdraw stuck funds
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    /**
     * @notice Get contract stats
     * @return totalRequests Total requests created
     * @return currentRequestId Current request ID
     */
    function getContractStats()
        external
        view
        returns (uint256 totalRequests, uint256 currentRequestId)
    {
        return (nextRequestId - 1, nextRequestId);
    }

    /**
     * @notice Check if a message has been processed (prevent replay attacks)
     * @param messageHash The message hash to check
     * @return Whether the message has been processed
     */
    function isMessageProcessed(
        bytes32 messageHash
    ) external view returns (bool) {
        return processedMessages[messageHash];
    }

    // Fallback function to receive Ether
    receive() external payable {}
}
