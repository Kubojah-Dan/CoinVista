/**
 * useSIWE — Sign-In With Ethereum (EIP-4361) hook
 *
 * Flow:
 * 1. Call signIn() → fetch nonce from /api/auth/siwe/nonce
 * 2. Build SIWE message with the nonce
 * 3. Request wallet signature via wagmi's signMessageAsync
 * 4. POST message + signature to /api/auth/siwe/verify
 * 5. On success, the backend marks wallet as verified and links it to the JWT session
 */
import { useState, useCallback } from 'react';
import { useSignMessage, useAccount, useChainId } from 'wagmi';
import { SiweMessage } from 'siwe';
import { toast } from 'react-hot-toast';
import api from '../services/api';

export type SiweStatus = 'idle' | 'fetching-nonce' | 'signing' | 'verifying' | 'verified' | 'error';

export interface SiweState {
    status: SiweStatus;
    isVerified: boolean;
    error: string | null;
    signIn: () => Promise<boolean>;
}

export function useSIWE(): SiweState {
    const { address } = useAccount();
    const chainId = useChainId();
    const { signMessageAsync } = useSignMessage();
    const [status, setStatus] = useState<SiweStatus>('idle');
    const [error, setError] = useState<string | null>(null);

    const signIn = useCallback(async (): Promise<boolean> => {
        if (!address) {
            toast.error('Please connect your wallet first.');
            return false;
        }

        try {
            // Step 1: Fetch nonce from backend
            setStatus('fetching-nonce');
            setError(null);
            const nonceRes = await api.get('/auth/siwe/nonce');
            const { nonce } = nonceRes.data;

            // Step 2: Build EIP-4361 SIWE message
            const message = new SiweMessage({
                domain: window.location.host,
                address,
                statement: 'Sign in to CoinVista to verify your wallet ownership.',
                uri: window.location.origin,
                version: '1',
                chainId,
                nonce,
                issuedAt: new Date().toISOString(),
            });

            const messageStr = message.prepareMessage();

            // Step 3: Request signature
            setStatus('signing');
            const signature = await signMessageAsync({ message: messageStr, account: address });

            // Step 4: Verify with backend
            setStatus('verifying');
            await api.post('/auth/siwe/verify', {
                message: messageStr,
                signature,
            });

            setStatus('verified');
            toast.success('Wallet verified! ✓');
            return true;

        } catch (err: unknown) {
            setStatus('error');
            const message = err instanceof Error ? err.message : 'SIWE verification failed.';

            // Don't show toast for user-rejected signature
            if (!message.toLowerCase().includes('rejected') && !message.toLowerCase().includes('denied')) {
                toast.error(message);
            }
            setError(message);
            return false;
        }
    }, [address, chainId, signMessageAsync]);

    return {
        status,
        isVerified: status === 'verified',
        error,
        signIn,
    };
}
