import { JustaName } from '@justaname.id/sdk';

// Initialize the SDK with your configuration
export const justaname = (providerUrl: string) => {
  return JustaName.init({
    networks: [
      {
        chainId: 1, // Ethereum Mainnet
        providerUrl,
      },
    ],
  });
};
