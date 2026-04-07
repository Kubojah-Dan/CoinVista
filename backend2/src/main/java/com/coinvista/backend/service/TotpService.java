package com.coinvista.backend.service;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class TotpService {

    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final CryptoSecurityService cryptoSecurityService;

    public TotpService(CryptoSecurityService cryptoSecurityService) {
        this.cryptoSecurityService = cryptoSecurityService;
    }

    public String generateSecret() {
        return encodeBase32(cryptoSecurityService.generateRandomBytes(20));
    }

    public boolean verifyCode(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null || !code.matches("\\d{6}")) {
            return false;
        }

        long timeWindow = System.currentTimeMillis() / 1000L / 30L;
        for (long offset = -1; offset <= 1; offset++) {
            String candidate = generateCode(secret, timeWindow + offset);
            if (candidate.equals(code)) {
                return true;
            }
        }
        return false;
    }

    public String buildOtpAuthUrl(String issuer, String accountName, String secret) {
        String encodedIssuer = urlEncode(issuer);
        String encodedAccount = urlEncode(accountName);
        return "otpauth://totp/" + encodedIssuer + ":" + encodedAccount
                + "?secret=" + secret
                + "&issuer=" + encodedIssuer
                + "&algorithm=SHA1&digits=6&period=30";
    }

    private String generateCode(String secret, long timeWindow) {
        try {
            byte[] decodedSecret = decodeBase32(secret);
            byte[] data = ByteBuffer.allocate(8).putLong(timeWindow).array();

            Mac mac = Mac.getInstance("HmacSHA1");
            mac.init(new SecretKeySpec(decodedSecret, "HmacSHA1"));
            byte[] hash = mac.doFinal(data);

            int offset = hash[hash.length - 1] & 0x0F;
            int binary = ((hash[offset] & 0x7F) << 24)
                    | ((hash[offset + 1] & 0xFF) << 16)
                    | ((hash[offset + 2] & 0xFF) << 8)
                    | (hash[offset + 3] & 0xFF);

            int otp = binary % 1_000_000;
            return String.format(Locale.US, "%06d", otp);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to validate authenticator code", e);
        }
    }

    private byte[] decodeBase32(String input) {
        String normalized = input.replace("=", "").replace(" ", "").toUpperCase(Locale.US);
        ByteBuffer buffer = ByteBuffer.allocate((normalized.length() * 5) / 8 + 8);

        int current = 0;
        int bits = 0;
        for (char c : normalized.toCharArray()) {
            int value = BASE32_ALPHABET.indexOf(c);
            if (value < 0) {
                continue;
            }

            current = (current << 5) | value;
            bits += 5;

            if (bits >= 8) {
                buffer.put((byte) ((current >> (bits - 8)) & 0xFF));
                bits -= 8;
            }
        }

        buffer.flip();
        byte[] output = new byte[buffer.remaining()];
        buffer.get(output);
        return output;
    }

    private String encodeBase32(byte[] input) {
        StringBuilder builder = new StringBuilder();
        int current = 0;
        int bits = 0;

        for (byte value : input) {
            current = (current << 8) | (value & 0xFF);
            bits += 8;

            while (bits >= 5) {
                builder.append(BASE32_ALPHABET.charAt((current >> (bits - 5)) & 0x1F));
                bits -= 5;
            }
        }

        if (bits > 0) {
            builder.append(BASE32_ALPHABET.charAt((current << (5 - bits)) & 0x1F));
        }

        return builder.toString();
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
