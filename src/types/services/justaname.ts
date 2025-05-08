import { Hex } from "..";

export interface JustaNameSubnameResponse {
  statusCode: number;
  result: Result;
}

export interface Result {
  data: Data
  error: any
}

export interface Data {
  ens: string
  records: Records
  claimedAt: string
  isClaimed: boolean
  isJAN: boolean
}

export interface Records {
  texts: Text[]
  coins: Coin[]
  contentHash: any
  resolverAddress: string
}

export interface Text {
  key: string
  value: string
}

export interface Coin {
  id: number;
  value: string;
  name: string;
}

export interface JustaNameConfig extends Data {
  address: Hex
}
