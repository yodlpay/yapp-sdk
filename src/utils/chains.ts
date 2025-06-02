import { ALLOWED_CHAIN_IDS } from '@constants';
import { ChainId } from '@types';

export const isValidChainId = (chainId?: number): chainId is ChainId => {
  if (!chainId) return false;
  return ALLOWED_CHAIN_IDS.includes(chainId as ChainId);
};
