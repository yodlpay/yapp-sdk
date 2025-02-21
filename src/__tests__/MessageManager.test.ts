import { PaymentConfig } from '../types/config';
import { FiatCurrency } from '../types/currency';
import { MessageManager } from '../utils/MessageManager';

describe('MessageManager', () => {
  let messageManager: MessageManager;
  let mockPostMessage: jest.Mock;

  beforeEach(() => {
    // Clear all mocks between tests
    jest.clearAllMocks();

    // Mock window.parent.postMessage
    mockPostMessage = jest.fn();
    Object.defineProperty(window, 'parent', {
      value: { postMessage: mockPostMessage },
      writable: true,
    });

    // Create new instance for each test
    messageManager = new MessageManager('https://test.com');
  });

  describe('sendPaymentRequest', () => {
    it('should handle successful payment', async () => {
      const config: PaymentConfig = {
        amount: 100,
        currency: FiatCurrency.USD,
        memo: 'Test payment',
      };

      // Create a promise that will resolve with the payment request
      const paymentPromise = messageManager.sendPaymentRequest('0x123', config);

      // Simulate successful payment response
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://test.com',
          data: {
            type: 'PAYMENT_SUCCESS',
            payload: {
              txHash: '0xabc',
              chainId: 1,
            },
          },
        }),
      );

      // Wait for the promise to resolve
      const result = await paymentPromise;

      // Verify the result
      expect(result).toEqual({
        txHash: '0xabc',
        chainId: 1,
      });

      // Verify postMessage was called correctly
      expect(mockPostMessage).toHaveBeenCalledWith(
        {
          type: 'PAYMENT_REQUEST',
          payload: {
            address: '0x123',
            amount: 100,
            currency: FiatCurrency.USD,
            memo: 'Test payment',
          },
        },
        'https://test.com',
      );
    });

    it('should handle payment cancellation', async () => {
      const config: PaymentConfig = {
        amount: 100,
        currency: FiatCurrency.USD,
      };

      const paymentPromise = messageManager.sendPaymentRequest('0x123', config);

      // Simulate payment cancellation
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://test.com',
          data: {
            type: 'PAYMENT_CANCELLED',
          },
        }),
      );

      await expect(paymentPromise).rejects.toThrow('Payment was cancelled');
    });

    describe('memo validation', () => {
      it('should accept memo within 32 bytes', async () => {
        const shortMemo = 'Short memo that fits';
        const paymentPromise = messageManager.sendPaymentRequest('0x123', {
          amount: 100,
          currency: FiatCurrency.USD,
          memo: shortMemo,
        });

        // Simulate successful response to avoid timeout
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://test.com',
            data: {
              type: 'PAYMENT_SUCCESS',
              payload: {
                txHash: '0xabc',
                chainId: 1,
              },
            },
          }),
        );

        await expect(paymentPromise).resolves.toBeTruthy();
      });

      it('should reject memo exceeding 32 bytes', async () => {
        const longMemo =
          'This is a very long memo that definitely exceeds thirty two bytes and should cause an error';

        await expect(
          messageManager.sendPaymentRequest('0x123', {
            amount: 100,
            currency: FiatCurrency.USD,
            memo: longMemo,
          }),
        ).rejects.toThrow('Memo exceeds maximum size of 32 bytes');
      });

      it('should accept undefined memo', async () => {
        const paymentPromise = messageManager.sendPaymentRequest('0x123', {
          amount: 100,
          currency: FiatCurrency.USD,
        });

        // Simulate successful response
        window.dispatchEvent(
          new MessageEvent('message', {
            origin: 'https://test.com',
            data: {
              type: 'PAYMENT_SUCCESS',
              payload: {
                txHash: '0xabc',
                chainId: 1,
              },
            },
          }),
        );

        await expect(paymentPromise).resolves.toBeTruthy();
      });
    });
  });

  describe('origin validation', () => {
    it('should reject messages from invalid origins', async () => {
      const paymentPromise = messageManager.sendPaymentRequest('0x123', {
        amount: 100,
        currency: FiatCurrency.USD,
      });

      // Simulate response from wrong origin
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://wrong-origin.com',
          data: {
            type: 'PAYMENT_SUCCESS',
            payload: {
              txHash: '0xabc',
              chainId: 1,
            },
          },
        }),
      );

      // Should timeout since invalid origin message is ignored
      await expect(paymentPromise).rejects.toThrow('Payment request timed out');
    });
  });
});
