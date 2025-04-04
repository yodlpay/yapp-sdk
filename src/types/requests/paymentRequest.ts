import { Hex } from 'src';

export type PaymentStatus =
  | { payment: PaymentStatusBody }
  | { error: 'NotFound' };

export interface PaymentStatusBody {
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
