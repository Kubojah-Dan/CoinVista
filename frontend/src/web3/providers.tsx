import React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './config';

// Import RainbowKit styles
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 30-second stale time for on-chain data
            staleTime: 30_000,
            // Retry 2 times on failure
            retry: 2,
        },
    },
});

// Custom CoinVista theme for RainbowKit
const coinvistaTheme = {
    ...darkTheme({
        accentColor: '#3b82f6',         // primary blue
        accentColorForeground: 'white',
        borderRadius: 'large',
        fontStack: 'system',
        overlayBlur: 'small',
    }),
};

const coinvistaLightTheme = {
    ...lightTheme({
        accentColor: '#3b82f6',
        accentColorForeground: 'white',
        borderRadius: 'large',
        fontStack: 'system',
        overlayBlur: 'small',
    }),
};

interface Web3ProvidersProps {
    children: React.ReactNode;
    isDark?: boolean;
}

export function Web3Providers({ children, isDark = true }: Web3ProvidersProps) {
    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider
                    theme={isDark ? coinvistaTheme : coinvistaLightTheme}
                    appInfo={{
                        appName: 'CoinVista',
                        learnMoreUrl: 'https://coinvista.app/about',
                    }}
                    modalSize="compact"
                    locale="en-US"
                >
                    {children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
