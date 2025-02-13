# 🚀 Yodl Yapp SDK

The official SDK for building Yodl Yapps. This SDK provides a secure way to interact with the Yodl platform, handling authentication and payment requests.

## 📦 Installation

```bash
npm install @yodl/yapp-sdk
```

## ⚡ Quick Start

```typescript
import { YappSDK } from '@yodl/yapp-sdk';

// Initialize the SDK with your domain and public key
const sdk = new YappSDK({
  ensName: "my-yapp.eth"
  // origin: "https://my-test-env.dev",
  // publicKey: "my-test-public-key" // ES256 PEM encoded public key
});

// Example: Validate a JWT token
try {
  const decodedData = await sdk.verify(url.searchParams.get('jwt'));
  console.log('Token payload:', decodedData);
} catch (error) {
  console.error('Token validation failed:', error);
}
```

## ✨ Features

### 🎟️ Token Validation

When a user connects to your Yapp, the JWT token is automatically provided as a URL parameter `?token=`. You can validate this token to get the user's information:

```typescript
// Get the JWT token from URL parameter
const urlParams = new URLSearchParams(window.location.search);
const jwtToken = urlParams.get('token');

// Validate JWT token securely
const payload = await sdk.verify(jwtToken);

// The payload contains user information as defined in JWTPayload:
console.log(payload.sub); // User's Ethereum address
console.log(payload.ens); // User's primary ENS name
console.log(payload.iss); // Community ENS name
console.log(payload.aud); // Yapp application ENS name
```

The JWT payload contains essential user information:

- `sub`: User's Ethereum wallet address (e.g., "0x742d35Cc6634C0532925a3b844Bc454e4438f44e") 👛
- `ens`: User's primary ENS name (e.g., "user.eth") 🏷️
- `iss`: User's community ENS name (e.g., "user.community.eth") 👥
- `aud`: MUST match your ensName in the YappSDK config. 

### 💸 Payment Requests

```typescript
// Request a payment
const paymentConfig = {
  amount: 100,
  currency: 'USD',
  memo: 'order_123', // Can be any identifier (max 32 bytes) for your business logic
};

// Example with different memo use cases
const examples = [
  { amount: 50, currency: 'USD', memo: 'subscription_id_456' }, // Track subscriptions
  { amount: 75, currency: 'EUR', memo: 'invoice_789' }, // Link to invoices
  { amount: 120, currency: 'THB', memo: 'product_xyz_123' }, // Product purchases
];

sdk.requestPayment('recipient-address', paymentConfig);
```

The `memo` field in payment requests serves two purposes:

1. 📝 As a human-readable payment description
2. 🔍 As a unique identifier (max 32 bytes) that you can use to track and process payments in your business logic

The memo data is stored on-chain with the transaction, allowing you to verify and track payments by querying the blockchain. This enables reliable payment verification and automated processing based on the memo identifier.

### 🔍 Iframe Detection

```typescript
import { isInIframe } from '@yodl/yapp-sdk';

// Check if your code is running inside an iframe
if (isInIframe()) {
  console.log('Running inside an iframe');
} else {
  console.log('Running in the main window');
}
```

This utility helps you detect whether your Yapp is running inside an iframe, which is useful for:

- Implementing iframe-specific security measures
- Adjusting UI/UX based on the context
- Managing cross-origin communication safely

### 🚪 Closing the Application

```typescript
// Close the Yapp securely
sdk.close('https://parent-origin.com');
```

## 🔒 Security Considerations

- 🛡️ Always validate the origin of messages using the SDK's built-in security features
- 🔑 The public key can be fetched from https://yodl.me/assets/yodl-public-key.pem
- ✅ Validate all input data before processing

## 📚 API Reference

For detailed API documentation, please run:

```bash
npm run docs
```

This will generate comprehensive API documentation in the `docs` directory.

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📄 License

MIT License - see LICENSE file for details.
