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
        private Boolean privacyModeEnabled;
        private Boolean emailNotificationsEnabled;
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
        private boolean twoFactorEnabled;
        private Double paperStartingBalance;
        private Double paperCashBalance;
        private String walletAddress;
        private boolean emailVerified;
        private int watchlistCount;
        private int alertCount;
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
}
