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
