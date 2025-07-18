export const CROSSBEG_ABI = [
  {
    type: "constructor",
    inputs: [
      { name: "_mailbox", type: "address", internalType: "address" },
      { name: "_localDomain", type: "uint32", internalType: "uint32" }
    ],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "cancelPaymentRequest",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "createPaymentRequest",
    inputs: [
      { name: "target", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "token", type: "string", internalType: "string" },
      { name: "targetChain", type: "uint32", internalType: "uint32" },
      { name: "message", type: "string", internalType: "string" },
      { name: "expiryTime", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "emergencyWithdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "fulfillPaymentRequest",
    inputs: [
      { name: "requestId", type: "uint256", internalType: "uint256" },
      { name: "txHash", type: "string", internalType: "string" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "getContractStats",
    inputs: [],
    outputs: [
      { name: "totalRequests", type: "uint256", internalType: "uint256" },
      { name: "currentRequestId", type: "uint256", internalType: "uint256" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPaymentRequest",
    inputs: [{ name: "requestId", type: "uint256", internalType: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        internalType: "struct CrossBegPaymentRequest.PaymentRequest",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "requester", type: "address", internalType: "address" },
          { name: "target", type: "address", internalType: "address" },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "token", type: "string", internalType: "string" },
          { name: "originChain", type: "uint32", internalType: "uint32" },
          { name: "targetChain", type: "uint32", internalType: "uint32" },
          { name: "message", type: "string", internalType: "string" },
          { 
            name: "status", 
            type: "uint8", 
            internalType: "enum CrossBegPaymentRequest.RequestStatus" 
          },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "expiryTime", type: "uint256", internalType: "uint256" },
          { name: "fulfillmentTxHash", type: "string", internalType: "string" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getPaymentRequests",
    inputs: [{ name: "requestIds", type: "uint256[]", internalType: "uint256[]" }],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        internalType: "struct CrossBegPaymentRequest.PaymentRequest[]",
        components: [
          { name: "id", type: "uint256", internalType: "uint256" },
          { name: "requester", type: "address", internalType: "address" },
          { name: "target", type: "address", internalType: "address" },
          { name: "amount", type: "uint256", internalType: "uint256" },
          { name: "token", type: "string", internalType: "string" },
          { name: "originChain", type: "uint32", internalType: "uint32" },
          { name: "targetChain", type: "uint32", internalType: "uint32" },
          { name: "message", type: "string", internalType: "string" },
          { 
            name: "status", 
            type: "uint8", 
            internalType: "enum CrossBegPaymentRequest.RequestStatus" 
          },
          { name: "timestamp", type: "uint256", internalType: "uint256" },
          { name: "expiryTime", type: "uint256", internalType: "uint256" },
          { name: "fulfillmentTxHash", type: "string", internalType: "string" }
        ]
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getSupportedChains",
    inputs: [{ name: "chainIds", type: "uint32[]", internalType: "uint32[]" }],
    outputs: [{ name: "", type: "bool[]", internalType: "bool[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserReceivedRequests",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "getUserSentRequests",
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "handle",
    inputs: [
      { name: "_origin", type: "uint32", internalType: "uint32" },
      { name: "_sender", type: "bytes32", internalType: "bytes32" },
      { name: "_messageBody", type: "bytes", internalType: "bytes" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "localDomain",
    inputs: [],
    outputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "mailbox",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "contract IMailbox" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "markExpiredRequests",
    inputs: [{ name: "requestIds", type: "uint256[]", internalType: "uint256[]" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "nextRequestId",
    inputs: [],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "owner",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "paymentRequests",
    inputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    outputs: [
      { name: "id", type: "uint256", internalType: "uint256" },
      { name: "requester", type: "address", internalType: "address" },
      { name: "target", type: "address", internalType: "address" },
      { name: "amount", type: "uint256", internalType: "uint256" },
      { name: "token", type: "string", internalType: "string" },
      { name: "originChain", type: "uint32", internalType: "uint32" },
      { name: "targetChain", type: "uint32", internalType: "uint32" },
      { name: "message", type: "string", internalType: "string" },
      { 
        name: "status", 
        type: "uint8", 
        internalType: "enum CrossBegPaymentRequest.RequestStatus" 
      },
      { name: "timestamp", type: "uint256", internalType: "uint256" },
      { name: "expiryTime", type: "uint256", internalType: "uint256" },
      { name: "fulfillmentTxHash", type: "string", internalType: "string" }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "quoteGasPayment",
    inputs: [
      { name: "destinationChain", type: "uint32", internalType: "uint32" },
      { name: "messageBody", type: "bytes", internalType: "bytes" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "remoteCrossBegContracts",
    inputs: [{ name: "", type: "uint32", internalType: "uint32" }],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "setRemoteContract",
    inputs: [
      { name: "chainId", type: "uint32", internalType: "uint32" },
      { name: "contractAddress", type: "address", internalType: "address" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "setRemoteContracts",
    inputs: [
      { name: "chainIds", type: "uint32[]", internalType: "uint32[]" },
      { name: "contractAddresses", type: "address[]", internalType: "address[]" }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "transferOwnership",
    inputs: [{ name: "newOwner", type: "address", internalType: "address" }],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "userReceivedRequests",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "userSentRequests",
    inputs: [
      { name: "", type: "address", internalType: "address" },
      { name: "", type: "uint256", internalType: "uint256" }
    ],
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "CrossChainMessageSent",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "destinationChain", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "messageId", type: "bytes32", indexed: false, internalType: "bytes32" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PaymentRequestCancelled",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "requester", type: "address", indexed: true, internalType: "address" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PaymentRequestCreated",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "requester", type: "address", indexed: true, internalType: "address" },
      { name: "target", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "token", type: "string", indexed: false, internalType: "string" },
      { name: "targetChain", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "message", type: "string", indexed: false, internalType: "string" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PaymentRequestFulfilled",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "payer", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "token", type: "string", indexed: false, internalType: "string" },
      { name: "txHash", type: "string", indexed: false, internalType: "string" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PaymentRequestReceived",
    inputs: [
      { name: "requestId", type: "uint256", indexed: true, internalType: "uint256" },
      { name: "requester", type: "address", indexed: true, internalType: "address" },
      { name: "target", type: "address", indexed: true, internalType: "address" },
      { name: "amount", type: "uint256", indexed: false, internalType: "uint256" },
      { name: "token", type: "string", indexed: false, internalType: "string" },
      { name: "originChain", type: "uint32", indexed: false, internalType: "uint32" },
      { name: "message", type: "string", indexed: false, internalType: "string" },
      { name: "timestamp", type: "uint256", indexed: false, internalType: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "receive",
    stateMutability: "payable"
  }
] as const;
