import { Hex } from 'src';

export interface PaymentSimple {
  chainId: number;
  txHash: Hex;
  paymentIndex: number;
  destinationChainId: number;
  destinationTxHash: Hex;
  blockTimestamp: string;
  tokenOutSymbol: string;
  tokenOutAddress: string;
  tokenOutAmountGross: string;
  receiverAddress: string;
  receiverEnsPrimaryName: string;
  receiverYodlConfig: ReceiverYodlConfig;
  invoiceCurrency: string;
  invoiceAmount: string;
  senderAddress: string;
  senderEnsPrimaryName: string;
  memo: string;
}

export type GetPaymentResponse =
  | { payment: PaymentSimple }
  | { error: 'NotFound' };

export type GetPaymentsResponse =
  | { payment: PaymentSimple[]; page: number; perPage: number; total: number }
  | { error: 'NotFound' };

export interface ReceiverYodlConfig {
  og: Og;
  amount: number;
  chainIds: number[];
  currency: string;
  webhooks: string[];
  tokenSymbols: string[];
}

export interface Og {
  baseUrl: string;
}

export interface GetPaymentsQuery {
  sender: Hex;
  receiver: Hex;

  senderEnsPrimaryName: string;
  receiverEnsPrimaryName: string;

  page: number;
  // min 1, max 1000
  perPage: number;

  sortBy: 'blockTimestamp' | 'amountUSD';
  sortDir: 'asc' | 'desc';
}
