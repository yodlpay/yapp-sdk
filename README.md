# 🚀 Yodl Yapp SDK

The official SDK for building Yodl Yapps. This SDK provides a secure way to interact with the Yodl platform, handling authentication, payment requests, and cross-origin communication.

## 📦 Installation

```bash
npm install @yodlpay/yapp-sdk
```

## ⚡ Quick Start

```typescript
import YappSDK from '@yodlpay/yapp-sdk';

// Initialize the SDK with default configuration
const sdk = new YappSDK();
```

## 💰 Payment Creation Example

Here's a focused example demonstrating how to create payments with the YappSDK:

```tsx
import React, { useState, useEffect } from 'react';
import YappSDK, { FiatCurrency, Payment, isInIframe } from '@yodlpay/yapp-sdk';

// Initialize with minimal configuration
const sdk = new YappSDK();

function PaymentExample() {
  const [paymentResult, setPaymentResult] = useState<Payment | null>(null);
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

#### Payment Modes

The SDK operates in two different modes depending on the environment:

1. **Iframe Mode**

   - Used automatically when your Yapp is running inside an iframe
   - Communicates using the postMessage API
   - Doesn't require a redirectUrl
   - Provides a seamless in-app experience

2. **Redirect Mode**
   - Used when your Yapp is running standalone (not in an iframe)
   - Requires a `redirectUrl` parameter to return after payment
   - Uses URL parameters and session storage to track payment state
   - Handles browser tab visibility changes to detect returns from payment flow

#### Error Handling

The payment request might throw errors in several scenarios:

```typescript
try {
  const response = await sdk.requestPayment('0x123...', config);
  // Handle successful payment
} catch (error) {
  if (error.message === 'Payment was cancelled') {
    // User cancelled the payment
  } else if (error.message === 'Payment request timed out') {
    // Payment took too long (default timeout: 5 minutes)
  } else if (error.message.includes('ENS name not found')) {
    // ENS name resolution failed
  } else if (error.message.includes('Invalid currency')) {
    // Unsupported currency was specified
  } else if (error.message.includes('Memo exceeds maximum size')) {
    // Memo was too large (max 32 bytes)
  } else if (error.message.includes('Amount must be a positive number')) {
    // Amount was invalid
  } else if (error.message.includes('Redirect URL is required')) {
    // Running outside iframe without redirectUrl
  } else {
    // Other errors
  }
}
```

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

### 🔍 Fetching Payment Details

Once you have the transaction hash from a successful payment, you can fetch the complete payment details using the Yodl API:

```typescript
// Example of fetching payment details with the transaction hash
const fetchPaymentDetails = async (txHash) => {
  try {
    const response = await fetch(
      `https://tx.yodl.me/api/v1/payments/${txHash}`,
    );
    const data = await response.json();
    return data.payment;
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};
```

The API response includes comprehensive payment information:

```json
{
  "payment": {
    "chainId": 8453,
    "txHash": "0x123c86bcf2a0aeadd269f30719a6ce7eef515a1a36600751a42ca77d42c802bc",
    "paymentIndex": 0,
    "destinationChainId": null,
    "destinationTxHash": null,
    "blockTimestamp": "2025-02-24T12:09:37.000Z",
    "tokenOutSymbol": "USDC",
    "tokenOutAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "tokenOutAmountGross": "10.03888",
    "receiverAddress": "0xa1833B1A4DC461D3C025DbC99B71b127AEdbA45c",
    "receiverEnsPrimaryName": null,
    "invoiceCurrency": "USD",
    "invoiceAmount": "10.04",
    "senderAddress": "0x065c1BC23aE559BFFDBE5bbc335C30f30bE2b992",
    "senderEnsPrimaryName": "maradona.yodl.eth"
  }
}
```

#### Payment Response Structure

The `requestPayment` method returns a Promise that resolves to a `Payment` object with the following structure:

```typescript
interface Payment {
  txHash: string; // Transaction hash (Hex string)
  chainId: number; // Chain ID where transaction was executed
}
```

This basic response provides essential information to track the payment on-chain. To get more detailed information, you'll need to use the Yodl API as shown above.

#### ENS Name Resolution

The SDK supports both standard Ethereum addresses and ENS (Ethereum Name Service) names as payment recipients:

```typescript
// Using a standard Ethereum address
await sdk.requestPayment('0x742d35Cc6634C0532925a3b844Bc454e4438f44e', config);

// Using an ENS name
await sdk.requestPayment('vitalik.eth', config);
```

When using ENS names, there are some important considerations:

1. **Resolution Handling**

   - ENS resolution happens on the Yodl side
   - If the ENS name cannot be resolved, the error `ENS name not found: [name]` will be thrown
   - Always handle this error appropriately in your application

2. **Performance Implications**

   - ENS resolution adds a small delay to the payment process
   - For performance-sensitive applications, consider resolving ENS names in advance and using the resulting address

3. **Testing**

   ```typescript
   try {
     await sdk.requestPayment('nonexistent-name.eth', config);
   } catch (error) {
     if (error.message.includes('ENS name not found')) {
       // Handle ENS resolution failure
       console.error('The ENS name could not be resolved');
     }
   }
   ```

#### Advanced Payment Tracking

For applications requiring robust payment tracking:

1. **Generate Unique Memos**

   ```typescript
   // Generate a unique memo combining order ID and timestamp
   const uniqueMemo = `order_${orderId}_${Date.now()}`;
   ```

2. **Store Payment State**

   ```typescript
   // Store pending payment state in your database
   await storePaymentIntent({
     orderId,
     memo: uniqueMemo,
     amount: 50,
     currency: FiatCurrency.USD,
     status: 'pending',
     timestamp: new Date(),
   });
   ```

3. **Update After Completion**

   ```typescript
   // After payment completes
   await updatePaymentStatus({
     memo: uniqueMemo,
     status: 'completed',
     txHash: payment.txHash,
     chainId: payment.chainId,
   });
   ```

4. **Handle Timeouts**

   The SDK automatically handles payment timeouts (default: 5 minutes), but your application should implement additional timeout handling for robustness.

   ```typescript
   // Set up payment timeout in your application
   setTimeout(
     async () => {
       const payment = await getPaymentByMemo(uniqueMemo);
       if (payment.status === 'pending') {
         await updatePaymentStatus({
           memo: uniqueMemo,
           status: 'timeout',
         });
         // Notify user or trigger recovery flow
       }
     },
     5 * 60 * 1000 + 30000,
   ); // 5 minutes + 30 seconds buffer
   ```

This detailed information can be used for:

- Verifying payment amounts and currencies
- Recording sender and receiver information
- Tracking payment timestamps
- Implementing receipt generation

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

1. **Origin Security**

   - Use HTTPS in production
   - Validate message origins in iframe mode
   - Set appropriate Content Security Policy (CSP) headers

2. **Payment Handling**

   - Store `memo` values securely
   - Implement proper error handling
   - Use timeouts appropriately (default: 5 minutes)
   - Validate the returned payment parameters to prevent spoofing

3. **Session Storage Considerations**

   - The SDK uses session storage to maintain payment state during redirects
   - This data is automatically cleared after payment completion or timeout
   - Consider implementing additional cleanup mechanisms for abandoned flows
   - Sensitive payment data (like customer information) should not be stored in the memo field

4. **Cross-Origin Communication**
   - Only accept messages from configured origins
   - Validate all incoming messages
   - Use secure postMessage communication

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

## Development

### Path Aliases

This codebase uses TypeScript path aliases for cleaner imports:

- `@utils` - Points to `src/utils`
- `@managers` - Points to `src/managers`
- `@constants` - Points to `src/constants`
- `@types` - Points to `src/types`

These aliases are properly resolved during build time using `tsc-alias` and `tsconfig-paths-webpack-plugin` for the CommonJS and UMD outputs, respectively.
