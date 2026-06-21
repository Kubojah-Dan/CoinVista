import { createConfig, http } from 'wagmi';
import {
    mainnet,
    polygon,
    arbitrum,
    base,
    optimism,
    bsc,
} from 'wagmi/chains';
import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
    injectedWallet,
    rainbowWallet,
    walletConnectWallet,
    metaMaskWallet,
    coinbaseWallet,
    rabbyWallet,
    trustWallet,
    ledgerWallet,
} from '@rainbow-me/rainbowkit/wallets';

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '';

if (!projectId) {
    console.warn(
        '[CoinVista] VITE_WALLETCONNECT_PROJECT_ID is not set. ' +
        'Mobile wallet connections (WalletConnect) will not work. ' +
        'Get a free project ID at https://cloud.walletconnect.com'
    );
}

const connectors = connectorsForWallets(
    [
        {
            groupName: 'Popular',
            wallets: [
                metaMaskWallet,
                rabbyWallet,
                coinbaseWallet,
                rainbowWallet,
            ],
        },
        {
            groupName: 'Mobile & WalletConnect',
            wallets: [
                walletConnectWallet,
                trustWallet,
            ],
        },
        {
            groupName: 'Hardware',
            wallets: [
                ledgerWallet,
            ],
        },
        {
            groupName: 'Other',
            wallets: [
                injectedWallet,
            ],
        },
    ],
    {
        appName: 'CoinVista',
        projectId,
    }
);

export const wagmiConfig = createConfig({
    chains: [mainnet, polygon, arbitrum, base, optimism, bsc],
    connectors,
    transports: {
        [mainnet.id]: http(),
        [polygon.id]: http(),
        [arbitrum.id]: http(),
        [base.id]: http(),
        [optimism.id]: http(),
        [bsc.id]: http(),
    },
    // Persist connection across page refreshes using localStorage
    // wagmi v2 handles this automatically via the built-in storage
    ssr: false,
});

export { mainnet, polygon, arbitrum, base, optimism, bsc };
