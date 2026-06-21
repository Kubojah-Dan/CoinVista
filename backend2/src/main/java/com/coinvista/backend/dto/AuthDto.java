package com.coinvista.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

public class AuthDto {

    @Data
    public static class RegisterRequest {
        @NotBlank
        private String name;
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
    }

    @Data
    public static class LoginRequest {
        @NotBlank @Email
        private String email;
        @NotBlank
        private String password;
        private String totpCode;
    }

    @Data
    public static class UpdateSettingsRequest {
        private String name;
        private String avatarUrl;
        private Boolean privacyModeEnabled;
        private Boolean emailNotificationsEnabled;
        private Boolean whatsAppNotificationsEnabled;
        private String phoneNumber;
        @Pattern(
                regexp = "^$|^(0x[a-fA-F0-9]{40})$",
                message = "Wallet address must be a valid EVM address"
        )
        private String walletAddress;
    }

    @Data
    public static class TotpCodeRequest {
        @NotBlank
        private String code;
    }

    @Data
    public static class UserProfile {
        private String id;
        private String name;
        private String email;
        private String avatarUrl;
        private String authProvider;
        private boolean privacyModeEnabled;
        private boolean emailNotificationsEnabled;
        private boolean whatsAppNotificationsEnabled;
        private String phoneNumber;
        private boolean twoFactorEnabled;
        private Double paperStartingBalance;
        private Double paperCashBalance;
        private String walletAddress;
        private boolean walletVerified;
        private Long walletChainId;
        private boolean emailVerified;
        private int watchlistCount;
        private int alertCount;
        private String planId;
        private String planName;
        private String subscriptionStatus;
        private Long subscriptionPeriodEnd; // Epoch seconds
    }

    @Data
    public static class AuthResponse {
        private String message;
        private String accessToken;
        private boolean twoFactorRequired;
        private UserProfile user;
    }

    @Data
    public static class TwoFactorSetupResponse {
        private String secret;
        private String otpauthUrl;
        private String issuer;
    }

    /** Returned by GET /api/auth/siwe/nonce */
    @Data
    public static class SiweNonceResponse {
        private String nonce;
        private String issuedAt;
    }

    /** Request body for POST /api/auth/siwe/verify */
    @Data
    public static class SiweVerifyRequest {
        @NotBlank(message = "SIWE message is required")
        private String message;
        @NotBlank(message = "Signature is required")
        private String signature;
    }
}
