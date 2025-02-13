import { FiatCurrency } from './currency';

export interface BaseMessage {
  type: string;
  payload?: any;
}

export interface CloseMessage extends BaseMessage {
  type: 'CLOSE';
}

export interface PaymentMessage extends BaseMessage {
  type: 'PAYMENT_REQUEST';
  payload: {
    address: string;
    amount: number;
    currency: FiatCurrency;
    memo?: string;
  };
}
