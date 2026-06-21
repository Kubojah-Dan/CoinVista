package com.coinvista.backend.service;

import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.web3j.crypto.Hash;
import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Arrays;
import java.util.HexFormat;

/**
 * SiweService — Sign-In With Ethereum (EIP-4361) verification.
 *
 * Flow:
 * 1. generateNonce(userId) → creates a 16-byte random hex nonce, stores it on the User document.
 * 2. verifyAndLink(userId, message, signature) → recovers the signer from the ECDSA signature,
 *    validates the nonce in the message matches the stored nonce, then marks the wallet as verified.
 *
 * ECDSA recovery is done via web3j's Sign.signedPrefixedMessageToKey(), which handles
 * the Ethereum personal_sign prefix ("\x19Ethereum Signed Message:\n{len}").
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SiweService {

    private final UserRepository userRepository;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * Generate a single-use nonce and persist it on the user.
     * Returns the nonce string to send to the frontend.
     */
    public String generateNonce(String userId) {
        // 16 bytes = 32 hex chars — sufficient entropy for EIP-4361
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        String nonce = HexFormat.of().formatHex(bytes);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));
        user.setSiweNonce(nonce);
        userRepository.save(user);

        log.debug("[SIWE] Generated nonce for user={}: {}", userId, nonce);
        return nonce;
    }

    /**
     * Verify a SIWE message + signature.
     * On success: sets walletAddress, walletVerified=true, walletChainId, walletLinkedAt on the user.
     * On failure: throws an IllegalArgumentException with a descriptive message.
     *
     * @param userId    authenticated user performing the SIWE
     * @param message   the raw EIP-4361 message string
     * @param signature the hex-encoded secp256k1 signature (0x...)
     */
    public User verifyAndLink(String userId, String message, String signature) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalStateException("User not found: " + userId));

        String storedNonce = user.getSiweNonce();
        if (storedNonce == null || storedNonce.isBlank()) {
            throw new IllegalArgumentException("No SIWE nonce found. Request a new nonce first.");
        }

        // 1. Verify the nonce appears in the message
        if (!message.contains(storedNonce)) {
            throw new IllegalArgumentException("SIWE message nonce does not match the issued nonce.");
        }

        // 2. Recover the signing address from the signature
        String recoveredAddress;
        try {
            recoveredAddress = recoverAddress(message, signature);
        } catch (Exception e) {
            log.warn("[SIWE] Signature recovery failed for user={}: {}", userId, e.getMessage());
            throw new IllegalArgumentException("Invalid SIWE signature: " + e.getMessage());
        }

        // 3. Extract the claimed address from the SIWE message
        // EIP-4361 format: "...domain\n{address}\n..."
        // The address is on line 2 (index 1) of the message
        String claimedAddress = extractAddress(message);
        if (claimedAddress == null) {
            throw new IllegalArgumentException("Could not parse address from SIWE message.");
        }

        // 4. Compare (case-insensitive — Ethereum addresses are case-insensitive)
        if (!recoveredAddress.equalsIgnoreCase(claimedAddress)) {
            log.warn("[SIWE] Address mismatch for user={}: claimed={}, recovered={}",
                    userId, claimedAddress, recoveredAddress);
            throw new IllegalArgumentException("Signature does not match the claimed address.");
        }

        // 5. Extract chainId from message for storage
        Long chainId = extractChainId(message);

        // 6. Invalidate the nonce (single-use) and mark wallet as verified
        user.setSiweNonce(null);
        user.setWalletAddress(claimedAddress.toLowerCase());
        user.setWalletVerified(true);
        user.setWalletLinkedAt(Instant.now());
        user.setWalletChainId(chainId);
        user = userRepository.save(user);

        log.info("[SIWE] Wallet verified for user={}, address={}, chainId={}", userId, claimedAddress, chainId);
        return user;
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Recover the Ethereum address from a personal_sign message + signature.
     * Uses the Ethereum prefix: "\x19Ethereum Signed Message:\n{messageLength}{message}"
     */
    private String recoverAddress(String message, String signatureHex) throws Exception {
        // Hash the prefixed message (same as eth_sign / personal_sign)
        byte[] messageBytes = message.getBytes(StandardCharsets.UTF_8);
        String prefix = "\u0019Ethereum Signed Message:\n" + messageBytes.length;
        byte[] prefixedMessage = concat(prefix.getBytes(StandardCharsets.UTF_8), messageBytes);
        byte[] messageHash = Hash.sha3(prefixedMessage);

        // Decode the signature
        String sigHex = signatureHex.startsWith("0x") ? signatureHex.substring(2) : signatureHex;
        byte[] sigBytes = Numeric.hexStringToByteArray(sigHex);
        if (sigBytes.length != 65) {
            throw new IllegalArgumentException("Signature must be 65 bytes, got " + sigBytes.length);
        }

        byte[] r = Arrays.copyOfRange(sigBytes, 0, 32);
        byte[] s = Arrays.copyOfRange(sigBytes, 32, 64);
        byte v = sigBytes[64];

        // Ethereum uses v = 27 or 28; adjust if the wallet sent 0 or 1
        if (v < 27) v += 27;
        int recId = v - 27;

        Sign.SignatureData signatureData = new Sign.SignatureData(v, r, s);
        BigInteger publicKey = Sign.signedMessageHashToKey(messageHash, signatureData);
        return "0x" + Keys.getAddress(publicKey);
    }

    /**
     * Extracts the Ethereum address from a SIWE message.
     * EIP-4361 format guarantees the address is on line 2 (1-indexed).
     */
    private String extractAddress(String message) {
        String[] lines = message.split("\n");
        if (lines.length < 2) return null;
        String addressLine = lines[1].trim();
        // Validate it looks like an EVM address
        if (addressLine.startsWith("0x") && addressLine.length() == 42) {
            return addressLine;
        }
        return null;
    }

    /**
     * Extracts the Chain ID from a SIWE message.
     * Looks for a line like "Chain ID: 1"
     */
    private Long extractChainId(String message) {
        for (String line : message.split("\n")) {
            if (line.startsWith("Chain ID: ")) {
                try {
                    return Long.parseLong(line.substring("Chain ID: ".length()).trim());
                } catch (NumberFormatException e) {
                    // fallback
                }
            }
        }
        return null;
    }

    private byte[] concat(byte[] a, byte[] b) {
        byte[] result = new byte[a.length + b.length];
        System.arraycopy(a, 0, result, 0, a.length);
        System.arraycopy(b, 0, result, a.length, b.length);
        return result;
    }
}
