/**
 * useWallet — composable hook that wraps wagmi primitives
 * Provides a single, unified interface for all wallet state in CoinVista.
 */
import {
    useAccount,
    useBalance,
    useChainId,
    useDisconnect,
    useEnsName,
    useEnsAvatar,
} from 'wagmi';
import { mainnet } from 'wagmi/chains';

export interface WalletState {
    address: `0x${string}` | undefined;
    isConnected: boolean;
    isConnecting: boolean;
    chainId: number | undefined;
    /** Native token balance (ETH, MATIC, etc.) */
    nativeBalance: string | null;
    nativeSymbol: string;
    /** ENS name, e.g. "vitalik.eth" */
    ensName: string | null;
    ensAvatar: string | null;
    /** Short display address like "0x1234...abcd" */
    shortAddress: string | null;
    disconnect: () => void;
}

export function useWallet(): WalletState {
    const { address, isConnected, isConnecting } = useAccount();
    const chainId = useChainId();
    const { disconnect } = useDisconnect();

    // Balance for the currently connected address on current chain
    const { data: balanceData } = useBalance({
        address,
    });

    // ENS resolution — always resolve against Ethereum mainnet
    const { data: ensName } = useEnsName({
        address,
        chainId: mainnet.id,
    });

    const { data: ensAvatar } = useEnsAvatar({
        name: ensName ?? undefined,
        chainId: mainnet.id,
    });

    const shortAddress = address
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : null;

    const nativeBalance =
        isConnected && balanceData
            ? parseFloat(balanceData.formatted).toFixed(4)
            : null;

    return {
        address,
        isConnected,
        isConnecting,
        chainId,
        nativeBalance,
        nativeSymbol: balanceData?.symbol ?? 'ETH',
        ensName: ensName ?? null,
        ensAvatar: ensAvatar ?? null,
        shortAddress,
        disconnect,
    };
}
