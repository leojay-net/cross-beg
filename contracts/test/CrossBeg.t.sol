// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../src/CrossBeg.sol";
// import {PaymentRequestFulfilled, PaymentRequestCancelled} from "../src/CrossBeg.sol";

contract CrossBegPaymentRequestTest is Test {
    CrossBegPaymentRequest public mantleContract;
    CrossBegPaymentRequest public baseContract;
    CrossBegPaymentRequest public polygonContract;
    
    // Test addresses
    address public owner = makeAddr("owner");
    address public relayer = makeAddr("relayer");
    address public alice = makeAddr("alice");
    address public bob = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    
    // Chain IDs
    uint32 public constant MANTLE_CHAIN_ID = 5000;
    uint32 public constant BASE_CHAIN_ID = 84532;
    uint32 public constant POLYGON_CHAIN_ID = 80002;
    
    // Test constants
    string public constant TEST_TOKEN = "USDC";
    uint256 public constant TEST_AMOUNT = 100e6; // 100 USDC
    string public constant TEST_MESSAGE = "Payment for services";
    
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
        CrossBegPaymentRequest.MessageStatus status
    );
    
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
        CrossBegPaymentRequest.MessageStatus status
    );

    function setUp() public {
        vm.startPrank(owner);
        
        // Deploy contracts for different chains
        mantleContract = new CrossBegPaymentRequest(MANTLE_CHAIN_ID, relayer);
        baseContract = new CrossBegPaymentRequest(BASE_CHAIN_ID, relayer);
        polygonContract = new CrossBegPaymentRequest(POLYGON_CHAIN_ID, relayer);
        
        // Set up cross-chain support
        mantleContract.addSupportedChain(BASE_CHAIN_ID, address(baseContract));
        mantleContract.addSupportedChain(POLYGON_CHAIN_ID, address(polygonContract));
        
        baseContract.addSupportedChain(MANTLE_CHAIN_ID, address(mantleContract));
        baseContract.addSupportedChain(POLYGON_CHAIN_ID, address(polygonContract));
        
        polygonContract.addSupportedChain(MANTLE_CHAIN_ID, address(mantleContract));
        polygonContract.addSupportedChain(BASE_CHAIN_ID, address(baseContract));
        
        vm.stopPrank();
    }

    function testDeployment() public view {
        assertEq(mantleContract.owner(), owner);
        assertEq(mantleContract.relayer(), relayer);
        assertEq(mantleContract.localChainId(), MANTLE_CHAIN_ID);
        assertEq(mantleContract.nextRequestId(), 1);
    }

    function testTransferOwnership() public {
        vm.prank(owner);
        mantleContract.transferOwnership(alice);
        assertEq(mantleContract.owner(), alice);
        
        // Test revert for invalid address
        vm.prank(alice);
        vm.expectRevert("CrossBeg: invalid new owner");
        mantleContract.transferOwnership(address(0));
    }

    function testSetRelayer() public {
        vm.prank(owner);
        mantleContract.setRelayer(alice);
        assertEq(mantleContract.relayer(), alice);
        
        // Test revert for invalid address
        vm.prank(owner);
        vm.expectRevert("CrossBeg: invalid relayer");
        mantleContract.setRelayer(address(0));
    }

    function testAddSupportedChain() public {
        address newContract = makeAddr("newContract");
        uint32 newChainId = 12345;
        
        vm.prank(owner);
        mantleContract.addSupportedChain(newChainId, newContract);
        
        assertTrue(mantleContract.supportedChains(newChainId));
        assertEq(mantleContract.remoteCrossBegContracts(newChainId), newContract);
    }

    function testRemoveSupportedChain() public {
        vm.prank(owner);
        mantleContract.removeSupportedChain(BASE_CHAIN_ID);
        
        assertFalse(mantleContract.supportedChains(BASE_CHAIN_ID));
        assertEq(mantleContract.remoteCrossBegContracts(BASE_CHAIN_ID), address(0));
        
        // Test revert for local chain
        vm.prank(owner);
        vm.expectRevert("CrossBeg: cannot remove local chain");
        mantleContract.removeSupportedChain(MANTLE_CHAIN_ID);
    }

    function testCreateLocalPaymentRequest() public {
        vm.prank(alice);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentRequestCreated(
            1,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            block.timestamp,
            block.timestamp + 7 days
        );
        
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        assertEq(requestId, 1);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(1);
        assertEq(request.id, 1);
        assertEq(request.requester, alice);
        assertEq(request.target, bob);
        assertEq(request.amount, TEST_AMOUNT);
        assertEq(request.token, TEST_TOKEN);
        assertEq(request.originChain, MANTLE_CHAIN_ID);
        assertEq(request.targetChain, MANTLE_CHAIN_ID);
        assertEq(request.message, TEST_MESSAGE);
        assertTrue(request.status == CrossBegPaymentRequest.RequestStatus.Pending);
        assertTrue(request.messageStatus == CrossBegPaymentRequest.MessageStatus.Local);
        
        // Check user arrays
        uint256[] memory sentRequests = mantleContract.getUserSentRequests(alice);
        uint256[] memory receivedRequests = mantleContract.getUserReceivedRequests(bob);
        
        assertEq(sentRequests.length, 1);
        assertEq(sentRequests[0], 1);
        assertEq(receivedRequests.length, 1);
        assertEq(receivedRequests[0], 1);
    }

    function testCreateCrossChainPaymentRequest() public {
        vm.prank(alice);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentRequestCreated(
            1,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            block.timestamp,
            block.timestamp + 7 days
        );
        
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        assertEq(requestId, 1);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(1);
        assertEq(request.targetChain, BASE_CHAIN_ID);
        assertTrue(request.messageStatus == CrossBegPaymentRequest.MessageStatus.Sent);
        
        // Should not be in target's received requests on origin chain
        uint256[] memory receivedRequests = mantleContract.getUserReceivedRequests(bob);
        assertEq(receivedRequests.length, 0);
    }

    function testReceiveMessage() public {
        // First create a request on Mantle
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        CrossBegPaymentRequest.PaymentRequest memory originalRequest = mantleContract.getPaymentRequest(requestId);
        
        // Simulate relayer delivering message to Base
        vm.prank(relayer);
        
        vm.expectEmit(true, true, true, true);
        emit PaymentRequestReceived(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            CrossBegPaymentRequest.MessageStatus.Delivered
        );
        
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            originalRequest.messageHash
        );
        
        // Check the request was created on Base
        CrossBegPaymentRequest.PaymentRequest memory deliveredRequest = baseContract.getPaymentRequest(requestId);
        assertEq(deliveredRequest.id, requestId);
        assertEq(deliveredRequest.requester, alice);
        assertEq(deliveredRequest.target, bob);
        assertEq(deliveredRequest.originChain, MANTLE_CHAIN_ID);
        assertEq(deliveredRequest.targetChain, BASE_CHAIN_ID);
        assertTrue(deliveredRequest.messageStatus == CrossBegPaymentRequest.MessageStatus.Delivered);
        
        // Check target's received requests on Base
        uint256[] memory receivedRequests = baseContract.getUserReceivedRequests(bob);
        assertEq(receivedRequests.length, 1);
        assertEq(receivedRequests[0], requestId);
    }

    function testReceiveMessageReplayPrevention() public {
        // Create and deliver a message
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        CrossBegPaymentRequest.PaymentRequest memory originalRequest = mantleContract.getPaymentRequest(requestId);
        
        vm.prank(relayer);
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            originalRequest.messageHash
        );
        
        // Try to deliver the same message again
        vm.prank(relayer);
        vm.expectRevert("CrossBeg: message already processed");
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            originalRequest.messageHash
        );
    }

    function testReceiveMessageInvalidHash() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        CrossBegPaymentRequest.PaymentRequest memory originalRequest = mantleContract.getPaymentRequest(requestId);
        
        // Try to deliver with wrong hash
        vm.prank(relayer);
        vm.expectRevert("CrossBeg: invalid message hash");
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            bytes32("wrong_hash")
        );
    }

    function testFulfillPaymentRequest() public {
        // Create local request
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        string memory txHash = "0x1234567890abcdef";
        
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit CrossBegPaymentRequest.PaymentRequestFulfilled(requestId, bob, TEST_AMOUNT, TEST_TOKEN, txHash);
        
        mantleContract.fulfillPaymentRequest(requestId, txHash);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(requestId);
        assertTrue(request.status == CrossBegPaymentRequest.RequestStatus.Fulfilled);
        assertEq(request.fulfillmentTxHash, txHash);
    }

    function testFulfillPaymentRequestUnauthorized() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Charlie tries to fulfill Bob's request
        vm.prank(charlie);
        vm.expectRevert("CrossBeg: not the target of this request");
        mantleContract.fulfillPaymentRequest(requestId, "0x123");
    }

    function testCancelPaymentRequest() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit CrossBegPaymentRequest.PaymentRequestCancelled(requestId, alice);
        
        mantleContract.cancelPaymentRequest(requestId);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(requestId);
        assertTrue(request.status == CrossBegPaymentRequest.RequestStatus.Cancelled);
    }

    function testCancelPaymentRequestUnauthorized() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Bob tries to cancel Alice's request
        vm.prank(bob);
        vm.expectRevert("CrossBeg: not the requester");
        mantleContract.cancelPaymentRequest(requestId);
    }

    function testMarkExpiredRequests() public {
        // Create request with short expiry
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            1 hours
        );
        
        // Fast forward time
        vm.warp(block.timestamp + 2 hours);
        
        uint256[] memory requestIds = new uint256[](1);
        requestIds[0] = requestId;
        
        mantleContract.markExpiredRequests(requestIds);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(requestId);
        assertTrue(request.status == CrossBegPaymentRequest.RequestStatus.Expired);
    }

    function testCustomExpiryTime() public {
        uint256 customExpiry = 2 days;
        
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            customExpiry
        );
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(requestId);
        assertEq(request.expiryTime, block.timestamp + customExpiry);
    }

    function testInvalidExpiryTime() public {
        vm.prank(alice);
        vm.expectRevert("CrossBeg: invalid expiry time");
        mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            30 minutes // Less than MIN_EXPIRY_TIME
        );
        
        vm.prank(alice);
        vm.expectRevert("CrossBeg: invalid expiry time");
        mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            31 days // More than MAX_EXPIRY_TIME
        );
    }

    function testGetMultiplePaymentRequests() public {
        vm.startPrank(alice);
        
        uint256 requestId1 = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            "Request 1",
            0
        );
        
        uint256 requestId2 = mantleContract.createPaymentRequest(
            charlie,
            TEST_AMOUNT * 2,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            "Request 2",
            0
        );
        
        vm.stopPrank();
        
        uint256[] memory requestIds = new uint256[](2);
        requestIds[0] = requestId1;
        requestIds[1] = requestId2;
        
        CrossBegPaymentRequest.PaymentRequest[] memory requests = mantleContract.getPaymentRequests(requestIds);
        
        assertEq(requests.length, 2);
        assertEq(requests[0].id, requestId1);
        assertEq(requests[0].target, bob);
        assertEq(requests[1].id, requestId2);
        assertEq(requests[1].target, charlie);
        assertEq(requests[1].amount, TEST_AMOUNT * 2);
    }

    function testGetSupportedChains() public view {
        uint32[] memory chainIds = new uint32[](3);
        chainIds[0] = MANTLE_CHAIN_ID;
        chainIds[1] = BASE_CHAIN_ID;
        chainIds[2] = 999999; // Unsupported chain
        
        bool[] memory supported = mantleContract.getSupportedChains(chainIds);
        
        assertTrue(supported[0]); // Mantle (local)
        assertTrue(supported[1]); // Base
        assertFalse(supported[2]); // Unsupported
    }

    function testUpdateMessageStatus() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        vm.prank(relayer);
        mantleContract.updateMessageStatus(requestId, CrossBegPaymentRequest.MessageStatus.Failed);
        
        CrossBegPaymentRequest.PaymentRequest memory request = mantleContract.getPaymentRequest(requestId);
        assertTrue(request.messageStatus == CrossBegPaymentRequest.MessageStatus.Failed);
    }

    function testOnlyRelayerModifier() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Non-relayer tries to update status
        vm.prank(alice);
        vm.expectRevert("CrossBeg: not authorized relayer");
        mantleContract.updateMessageStatus(requestId, CrossBegPaymentRequest.MessageStatus.Failed);
    }

    function testInvalidInputs() public {
        vm.startPrank(alice);
        
        // Invalid target address
        vm.expectRevert("CrossBeg: invalid target address");
        mantleContract.createPaymentRequest(
            address(0),
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Zero amount
        vm.expectRevert("CrossBeg: amount must be greater than zero");
        mantleContract.createPaymentRequest(
            bob,
            0,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Empty token
        vm.expectRevert("CrossBeg: token cannot be empty");
        mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            "",
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Self request
        vm.expectRevert("CrossBeg: cannot request from yourself");
        mantleContract.createPaymentRequest(
            alice,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        // Unsupported chain
        vm.expectRevert("CrossBeg: target chain not supported");
        mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            999999,
            TEST_MESSAGE,
            0
        );
        
        vm.stopPrank();
    }

    function testEmergencyWithdraw() public {
        // Send some ETH to contract
        vm.deal(address(mantleContract), 1 ether);
        
        uint256 ownerBalanceBefore = owner.balance;
        
        vm.prank(owner);
        mantleContract.emergencyWithdraw();
        
        assertEq(address(mantleContract).balance, 0);
        assertEq(owner.balance, ownerBalanceBefore + 1 ether);
    }

    function testGetContractStats() public {
        vm.prank(alice);
        mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        (uint256 totalRequests, uint256 currentRequestId) = mantleContract.getContractStats();
        assertEq(totalRequests, 1);
        assertEq(currentRequestId, 2);
    }

    function testIsMessageProcessed() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            0
        );
        
        CrossBegPaymentRequest.PaymentRequest memory originalRequest = mantleContract.getPaymentRequest(requestId);
        
        assertFalse(baseContract.isMessageProcessed(originalRequest.messageHash));
        
        vm.prank(relayer);
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            originalRequest.messageHash
        );
        
        assertTrue(baseContract.isMessageProcessed(originalRequest.messageHash));
    }

    // Test edge cases and error conditions
    function testFulfillExpiredRequest() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            1 hours
        );
        
        // Fast forward past expiry
        vm.warp(block.timestamp + 2 hours);
        
        vm.prank(bob);
        vm.expectRevert("CrossBeg: request expired");
        mantleContract.fulfillPaymentRequest(requestId, "0x123");
    }

    function testReceiveExpiredMessage() public {
        vm.prank(alice);
        uint256 requestId = mantleContract.createPaymentRequest(
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            BASE_CHAIN_ID,
            TEST_MESSAGE,
            1 hours
        );
        
        CrossBegPaymentRequest.PaymentRequest memory originalRequest = mantleContract.getPaymentRequest(requestId);
        
        // Fast forward past expiry
        vm.warp(originalRequest.expiryTime + 1);
        
        vm.prank(relayer);
        vm.expectRevert("CrossBeg: request expired");
        baseContract.receiveMessage(
            requestId,
            alice,
            bob,
            TEST_AMOUNT,
            TEST_TOKEN,
            MANTLE_CHAIN_ID,
            TEST_MESSAGE,
            originalRequest.timestamp,
            originalRequest.expiryTime,
            originalRequest.messageHash
        );
    }

    function testNonExistentRequest() public {
        vm.expectRevert("CrossBeg: request does not exist");
        mantleContract.getPaymentRequest(999);
        
        vm.prank(alice);
        vm.expectRevert("CrossBeg: request does not exist");
        mantleContract.fulfillPaymentRequest(999, "0x123");
    }
}