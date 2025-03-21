# Test Suite Overview

This directory contains the test files for the Yapp SDK. Each test file focuses on specific functionality of the SDK.

## Test Files

### 1. MessageManager.test.ts

Tests the `MessageManager` class, which is responsible for communication between the Yapp SDK and the parent window.

**Key tests:**
- Constructor initialization and origin validation
- Payment request validation (memo size, currency, amount)
- Iframe payment flow (success, cancellation, timeout)
- Redirect payment flow (URL handling, session storage)
- Message sending security checks and origin validation
- Close message functionality

### 2. UserContext.test.ts

Tests the `MessageManager.getUserContext` method which retrieves user blockchain identity information.

**Key tests:**
- Error handling when window is not available
- Timeout handling when no response is received 
- Event listeners registration and cleanup
- Window API interactions
- Focuses on the low-level implementation details

### 3. YappSDK.getUserContext.test.ts

Tests the `YappSDK.getUserContext` method, focusing on the SDK wrapper around MessageManager.

**Key tests:**
- Proper delegation from YappSDK to MessageManager
- Successful return of user context data
- Error propagation from MessageManager to SDK consumers
- Uses a mock implementation of YappSDK to avoid dependency issues

### 4. isInIframe.test.ts

Tests the `isInIframe` utility function that detects whether the SDK is running inside an iframe.

**Key tests:**
- Detection when window.self and window.top are the same (not in iframe)
- Detection when window.self and window.top are different (in iframe)
- Handling of cross-origin security errors (indicating iframe usage)

### 5. memoValidation.test.ts

Tests the memo validation utilities used for payment descriptions.

**Key tests:**
- `isValidMemoSize`: Validation of memo size constraints (32 byte maximum)
- Correct handling of UTF-8 characters which may use multiple bytes
- `createValidMemoFromUUID`: Generation of valid memos from UUIDs
- Error handling for oversized inputs

## Test Strategy

The test suite uses the following strategies:
- **Unit testing**: Testing individual components in isolation
- **Mock objects**: Simulating browser APIs and dependencies
- **Edge cases**: Testing error conditions and boundary values
- **Integration**: Testing interactions between components

The UserContext and YappSDK.getUserContext test files complement each other:
- UserContext.test.ts tests the core implementation details
- YappSDK.getUserContext.test.ts tests the integration between components
- Together, they provide comprehensive test coverage from both implementation and API levels

## Running Tests

To run all tests:
```bash
npm test
```

To run a specific test file:
```bash
npm test -- --testPathPattern=UserContext
```