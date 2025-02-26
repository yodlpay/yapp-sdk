# 🚀 Yodl Yapp SDK

The official SDK for building Yodl Yapps. This SDK provides a secure way to interact with the Yodl platform, handling authentication, payment requests, and cross-origin communication.

## 📦 Installation

```bash
npm install @yodlpay/yapp-sdk
```

## ⚡ Quick Start

```typescript
import YappSDK from '@yodlpay/yapp-sdk';

// Initialize the SDK with your domain and public key
const sdk = new YappSDK({
  ensName: 'my-yapp.eth',
  // origin: "https://yodl.me", // Optional: defaults to https://yodl.me
  // publicKey: "my-test-public-key" // Optional: ES256 PEM encoded public key
});
```

## 💰 Payment Creation Example

Here's a focused example demonstrating how to create payments with the YappSDK:

```tsx
import React, { useState, useEffect } from 'react';
import YappSDK, {
  FiatCurrency,
  PaymentResponse,
  isInIframe,
} from '@yodlpay/yapp-sdk';

const sdk = new YappSDK({
  ensName: 'my-yapp.eth',
});

function PaymentExample() {
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for payment information in URL on component mount
  useEffect(() => {
    // Parse payment information from URL (for redirect flow)
    const urlPaymentResult = sdk.parsePaymentFromUrl();

    if (urlPaymentResult) {
      // Payment was successful via redirect
      setPaymentResult(urlPaymentResult);
      console.log('Payment successful (redirect):', urlPaymentResult);

      // Clean the URL to prevent duplicate processing on refresh
      // Note: You would need to implement this method or use history API
      cleanPaymentUrl();
    }
  }, []);

  // Helper function to clean payment parameters from URL
  const cleanPaymentUrl = () => {
    // Remove payment parameters from URL without page refresh
    const url = new URL(window.location.href);
    url.searchParams.delete('txHash');
    url.searchParams.delete('chainId');
    window.history.replaceState({}, document.title, url.toString());
  };

  // Create a new payment
  const createPayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Recipient address - replace with your actual recipient
      const recipientAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

      // Create a unique memo/order ID
      const orderId = `order_${Date.now()}`;

      // Request payment
      const response = await sdk.requestPayment(recipientAddress, {
        amount: 50,
        currency: FiatCurrency.USD,
        memo: orderId,
        redirectUrl: window.location.href, // Required for non-iframe mode
      });

      // Handle successful payment
      setPaymentResult(response);
      console.log('Payment successful:', response);
    } catch (error) {
      // Handle payment errors
      console.error('Payment failed:', error);

      if (error.message === 'Payment was cancelled') {
        setError('Payment was cancelled by user');
      } else if (error.message === 'Payment request timed out') {
        setError('Payment request timed out after 5 minutes');
      } else {
        setError(`Payment failed: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h1>Payment Example</h1>

      {/* Payment result */}
      {paymentResult && (
        <div className="success-message">
          <h2>Payment Successful!</h2>
          <p>
            <strong>Transaction Hash:</strong> {paymentResult.txHash}
          </p>
          <p>
            <strong>Chain ID:</strong> {paymentResult.chainId}
          </p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="loading">
          <p>Processing...</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="button-group">
        <button
          onClick={createPayment}
          disabled={isLoading}
          className="payment-button"
        >
          Create New Payment
        </button>
      </div>
    </div>
  );
}

export default PaymentExample;
```

### Key Points About Payment Creation

1. **Singleton SDK Instance**

   - The SDK is initialized once outside the component as a singleton
   - This allows the same SDK instance to be reused across multiple components

2. **Creating a Payment**

   - The `createPayment` function demonstrates how to request a new payment
   - It includes proper error handling for common scenarios (cancellation, timeout)
   - A unique memo/order ID is generated for each payment

3. **Payment States**

   - The example tracks loading states, errors, and successful payments
   - It provides appropriate UI feedback for each state

4. **Redirect Flow Support**
   - The component checks for payment information in the URL on mount using `parsePaymentFromUrl()`
   - Successfully handles both iframe and redirect payment flows
   - Cleans up URL parameters after processing to prevent duplicate handling

### 🔄 Payment Flow

The SDK provides a streamlined payment flow:

```typescript
// Make a payment request
const response = await sdk.requestPayment(address, config);
```

The payment flow handles both iframe and redirect modes automatically based on the environment.

#### Payment Configuration

- `amount`: Payment amount (positive number)
- `currency`: Currency code from `FiatCurrency` enum
- `memo`: Optional identifier/description (max 32 bytes)
- `redirectUrl`: Required when not in iframe mode

#### Memo Field Usage

The `memo` field serves two purposes:

1. 📝 Human-readable payment description
2. 🔍 Unique identifier for payment tracking

Example use cases:

```typescript
const examples = [
  { amount: 50, currency: FiatCurrency.USD, memo: 'subscription_id_456' },
  { amount: 75, currency: FiatCurrency.EUR, memo: 'invoice_789' },
  { amount: 120, currency: FiatCurrency.THB, memo: 'product_xyz_123' },
];
```

### 🖼️ Iframe Integration

#### Detection

```typescript
import { isInIframe } from '@yodlpay/yapp-sdk';

if (isInIframe()) {
  console.log('Running inside an iframe');
  // Implement iframe-specific logic
} else {
  console.log('Running in the main window');
  // Implement redirect-based flow
}
```

#### Closing the Yapp

```typescript
try {
  sdk.close('https://parent-origin.com');
} catch (error) {
  console.error('Failed to close:', error);
}
```

## 🔒 Security Best Practices

1. **Token Validation**

   - Always validate JWT tokens using `sdk.verify()`
   - Verify the `aud` claim matches your Yapp's ENS name

2. **Origin Security**

   - Use HTTPS in production
   - Validate message origins in iframe mode
   - Set appropriate Content Security Policy (CSP) headers

3. **Payment Handling**

   - Store `memo` values securely
   - Implement proper error handling
   - Use timeouts appropriately (default: 5 minutes)

4. **Cross-Origin Communication**
   - Only accept messages from configured origins
   - Validate all incoming messages
   - Use secure postMessage communication

## 🚨 Error Handling

The SDK throws specific errors that you should handle:

```typescript
try {
  // SDK operations
} catch (error) {
  switch (error.name) {
    case 'JWTAudError':
      // Handle invalid audience
      break;
    default:
      switch (error.message) {
        case 'Payment was cancelled':
          // Handle user cancellation
          break;
        case 'Payment request timed out':
          // Handle timeout (5 minutes)
          break;
        case 'Memo exceeds maximum size of 32 bytes':
          // Handle invalid memo
          break;
        default:
        // Handle other errors
      }
  }
}
```

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
