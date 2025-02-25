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

## 💰 Payment Creation & Recovery Example

Here's a focused example demonstrating how to create and recover payments with the YappSDK:

```tsx
import React, { useEffect, useState } from 'react';
import YappSDK, { FiatCurrency, PaymentResponse } from '@yodlpay/yapp-sdk';

const sdk = new YappSDK({
  ensName: 'my-yapp.eth',
});

function PaymentExample() {
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryAttempted, setRecoveryAttempted] = useState(false);

  // Attempt payment recovery on component mount
  useEffect(() => {
    const attemptRecovery = async () => {
      try {
        // Attempt to recover any pending payment
        setIsLoading(true);
        const recoveredPayment = await sdk.recoverPendingPayment();

        if (recoveredPayment) {
          console.log('Recovered payment:', recoveredPayment);
          setPaymentResult(recoveredPayment);
        }

        setRecoveryAttempted(true);
        setIsLoading(false);
      } catch (error) {
        console.error('Payment recovery failed:', error);
        setError('Failed to recover payment');
        setIsLoading(false);
        setRecoveryAttempted(true);
      }
    };

    attemptRecovery();
  }, []);

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

  // Manually attempt to recover a pending payment
  const recoverPayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const recoveredPayment = await sdk.recoverPendingPayment();

      if (recoveredPayment) {
        setPaymentResult(recoveredPayment);
        console.log('Payment recovered successfully:', recoveredPayment);
      } else {
        setError('No pending payment found to recover');
      }
    } catch (error) {
      console.error('Payment recovery failed:', error);
      setError(`Recovery failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h1>Payment Example</h1>

      {/* Show recovery status */}
      {recoveryAttempted && !paymentResult && !isLoading && (
        <div className="info-message">
          <p>No pending payments found to recover.</p>
        </div>
      )}

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

        <button
          onClick={recoverPayment}
          disabled={isLoading}
          className="recovery-button"
        >
          Recover Pending Payment
        </button>
      </div>
    </div>
  );
}

export default PaymentExample;
```

### Key Points About Payment Creation & Recovery

1. **Singleton SDK Instance**

   - The SDK is initialized once outside the component as a singleton
   - This allows the same SDK instance to be reused across multiple components

2. **Automatic Recovery on Initialization**

   - The component still attempts to recover pending payments when mounted
   - This happens in the `useEffect` hook, but now uses the shared SDK instance

3. **Creating a Payment**

   - The `createPayment` function demonstrates how to request a new payment
   - It includes proper error handling for common scenarios (cancellation, timeout)
   - A unique memo/order ID is generated for each payment

4. **Manual Recovery**

   - The `recoverPayment` function shows how to manually trigger payment recovery
   - This is useful when you want to give users a way to retry recovery

5. **Payment States**

   - The example tracks loading states, errors, and successful payments
   - It provides appropriate UI feedback for each state

6. **Implementation Notes**
   - Recovery is attempted automatically on component mount
   - Both iframe and redirect flows are supported with the `redirectUrl` parameter
   - Transaction details (hash and chain ID) are displayed after successful payment

This pattern ensures that users don't lose their payment progress due to page refreshes or navigation, providing a more reliable payment experience.

## 🔑 Key Features

### 🎟️ Authentication & Token Validation

The SDK provides secure JWT token validation for user authentication:

```typescript
try {
  // Get the JWT token from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const jwtToken = urlParams.get('token');

  // Validate JWT token securely
  const payload = await sdk.verify(jwtToken);

  // Access user information from the payload
  console.log(payload.sub); // User's Ethereum address
  console.log(payload.ens); // User's primary ENS name
  console.log(payload.iss); // Community ENS name
  console.log(payload.aud); // Yapp application ENS name
} catch (error) {
  if (error.name === 'JWTAudError') {
    console.error('Token was issued for a different Yapp');
  } else {
    console.error('Token validation failed:', error);
  }
}
```

#### JWT Payload Structure

- `sub`: User's Ethereum wallet address (e.g., "0x742d35Cc6634C0532925a3b844Bc454e4438f44e") 👛
- `ens`: User's primary ENS name (e.g., "user.eth") 🏷️
- `iss`: User's community ENS name (e.g., "user.community.eth") 👥
- `aud`: MUST match your ensName in the YappSDK config ✅

### 💸 Payment Processing

The SDK supports both iframe and redirect-based payment flows:

```typescript
import { FiatCurrency } from '@yodlpay/yapp-sdk';

try {
  const response = await sdk.requestPayment(
    '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
    {
      amount: 100,
      currency: FiatCurrency.USD,
      memo: 'order_123',
      redirectUrl: 'https://your-app.com/payment-callback', // Required for non-iframe mode
    },
  );

  console.log('Transaction hash:', response.txHash);
  console.log('Chain ID:', response.chainId);
} catch (error) {
  switch (error.message) {
    case 'Payment was cancelled':
      console.log('User cancelled the payment');
      break;
    case 'Payment request timed out':
      console.log('Payment timed out after 5 minutes');
      break;
    default:
      console.error('Payment failed:', error);
  }
}
```

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

### 🔄 Payment Recovery

The SDK provides both automatic and manual payment recovery after page reloads or interruptions:

#### Automatic Recovery

```typescript
// The SDK will automatically attempt to recover any pending payment
// when making a new payment request
const response = await sdk.requestPayment(address, config);
```

#### Manual Recovery

```typescript
// Explicitly check for and recover pending payments
try {
  const recoveredPayment = await sdk.recoverPendingPayment();
  if (recoveredPayment) {
    // Handle recovered payment
    console.log('Recovered payment:', recoveredPayment.txHash);
    console.log('Chain ID:', recoveredPayment.chainId);
  } else {
    // No pending payment found
    console.log('No pending payment to recover');
  }
} catch (error) {
  // Handle recovery errors (timeout, cancellation, etc.)
  console.error('Recovery failed:', error);
}
```

Manual recovery is useful when you want to:

- Check for pending payments without making a new request
- Implement custom recovery UI/logic
- Handle recovery separately from new payment requests

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
