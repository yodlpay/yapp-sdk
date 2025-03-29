import { JustaName } from '@justaname.id/sdk';

// Initialize the SDK with your configuration
export const justaname = JustaName.init({
  networks: [
    {
      chainId: 1, // Ethereum Mainnet
      providerUrl: 'https://eth.blockrazor.xyz',
    },
  ],
});
