package com.coinvista.backend.service;

import com.coinvista.backend.dto.AuthDto;
import com.coinvista.backend.model.RefreshSession;
import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.AlertRepository;
import com.coinvista.backend.repository.HoldingRepository;
import com.coinvista.backend.repository.PaperTradeRepository;
import com.coinvista.backend.repository.RefreshSessionRepository;
import com.coinvista.backend.repository.UserRepository;
import com.coinvista.backend.security.JwtUtil;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final HoldingRepository holdingRepository;
    private final AlertRepository alertRepository;
    private final PaperTradeRepository paperTradeRepository;
    private final RefreshSessionRepository refreshSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CryptoSecurityService cryptoSecurityService;
    private final TotpService totpService;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    public AuthResult register(AuthDto.RegisterRequest request, String userAgent, String ipAddress) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("User already exists");
        }

        User user = new User();
        user.setName(request.getName().trim());
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
        return createSession(user, userAgent, ipAddress, "Account created successfully");
    }

    public AuthResult login(AuthDto.LoginRequest request, String userAgent, String ipAddress) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new SecurityException("Invalid email or password"));

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new SecurityException("This account uses social login. Please continue with your provider.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new SecurityException("Invalid email or password");
        }

        if (user.isTwoFactorEnabled()) {
            String decryptedSecret = cryptoSecurityService.decrypt(user.getEncryptedTotpSecret());
            if (request.getTotpCode() == null || request.getTotpCode().isBlank()) {
                return AuthResult.twoFactorRequired(buildUserProfile(user));
            }
            if (!totpService.verifyCode(decryptedSecret, request.getTotpCode())) {
                throw new SecurityException("Invalid authenticator code");
            }
        }

        return createSession(user, userAgent, ipAddress, "Login successful");
    }

    public AuthResult refreshSession(String rawRefreshToken, String userAgent, String ipAddress) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new SecurityException("Refresh token missing");
        }
        if (!jwtUtil.validateRefreshToken(rawRefreshToken)) {
            throw new SecurityException("Refresh token is invalid or expired");
        }

        String sessionId = jwtUtil.extractSessionId(rawRefreshToken);
        String userId = jwtUtil.extractUserId(rawRefreshToken);
        RefreshSession session = refreshSessionRepository.findById(sessionId)
                .orElseThrow(() -> new SecurityException("Refresh session not found"));

        if (!userId.equals(session.getUserId())
                || session.getRevokedAt() != null
                || session.getExpiresAt().isBefore(Instant.now())
                || !cryptoSecurityService.hash(rawRefreshToken).equals(session.getTokenHash())) {
            throw new SecurityException("Refresh session expired");
        }

        session.setRevokedAt(Instant.now());
        refreshSessionRepository.save(session);
        refreshSessionRepository.deleteByExpiresAtBefore(Instant.now());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new SecurityException("User not found"));

        return createSession(user, userAgent, ipAddress, "Session refreshed");
    }

    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank() || !jwtUtil.validateRefreshToken(rawRefreshToken)) {
            return;
        }

        String sessionId = jwtUtil.extractSessionId(rawRefreshToken);
        refreshSessionRepository.findById(sessionId).ifPresent(session -> {
            session.setRevokedAt(Instant.now());
            refreshSessionRepository.save(session);
        });
    }

    public AuthDto.UserProfile getProfile(User user) {
        return buildUserProfile(user);
    }

    public AuthDto.UserProfile updateSettings(String userId, AuthDto.UpdateSettingsRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (request.getPrivacyModeEnabled() != null) {
            user.setPrivacyModeEnabled(request.getPrivacyModeEnabled());
        }
        if (request.getEmailNotificationsEnabled() != null) {
            user.setEmailNotificationsEnabled(request.getEmailNotificationsEnabled());
        }
        if (request.getWalletAddress() != null) {
            user.setWalletAddress(request.getWalletAddress().trim());
        }

        user.setUpdatedAt(Instant.now());
        return buildUserProfile(userRepository.save(user));
    }

    public AuthDto.TwoFactorSetupResponse setupTwoFactor(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String secret = totpService.generateSecret();
        user.setEncryptedPendingTotpSecret(cryptoSecurityService.encrypt(secret));
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);

        AuthDto.TwoFactorSetupResponse response = new AuthDto.TwoFactorSetupResponse();
        response.setSecret(secret);
        response.setIssuer("CoinVista");
        response.setOtpauthUrl(totpService.buildOtpAuthUrl("CoinVista", user.getEmail(), secret));
        return response;
    }

    public AuthDto.UserProfile verifyTwoFactorSetup(String userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String pendingSecret = cryptoSecurityService.decrypt(user.getEncryptedPendingTotpSecret());
        if (pendingSecret == null || pendingSecret.isBlank()) {
            throw new IllegalStateException("Two-factor setup has not been started");
        }
        if (!totpService.verifyCode(pendingSecret, code)) {
            throw new SecurityException("Invalid authenticator code");
        }

        user.setEncryptedTotpSecret(cryptoSecurityService.encrypt(pendingSecret));
        user.setEncryptedPendingTotpSecret(null);
        user.setTwoFactorEnabled(true);
        user.setUpdatedAt(Instant.now());
        return buildUserProfile(userRepository.save(user));
    }

    public AuthDto.UserProfile disableTwoFactor(String userId, String code) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        String secret = cryptoSecurityService.decrypt(user.getEncryptedTotpSecret());
        if (!user.isTwoFactorEnabled() || secret == null || secret.isBlank()) {
            throw new IllegalStateException("Two-factor authentication is not enabled");
        }
        if (!totpService.verifyCode(secret, code)) {
            throw new SecurityException("Invalid authenticator code");
        }

        user.setTwoFactorEnabled(false);
        user.setEncryptedTotpSecret(null);
        user.setEncryptedPendingTotpSecret(null);
        user.setUpdatedAt(Instant.now());
        return buildUserProfile(userRepository.save(user));
    }

    public void deleteAccount(String userId) {
        holdingRepository.deleteByUserId(userId);
        alertRepository.deleteByUserId(userId);
        paperTradeRepository.deleteByUserId(userId);
        refreshSessionRepository.deleteByUserId(userId);
        userRepository.deleteById(userId);
    }

    public AuthResult createSessionForUser(User user, String userAgent, String ipAddress, String message) {
        return createSession(user, userAgent, ipAddress, message);
    }

    private AuthResult createSession(User user, String userAgent, String ipAddress, String message) {
        RefreshSession session = new RefreshSession();
        session.setUserId(user.getId());
        session.setUserAgent(userAgent);
        session.setIpAddress(ipAddress);
        session.setExpiresAt(Instant.now().plusMillis(refreshTokenExpiration));
        refreshSessionRepository.save(session);

        String refreshToken = jwtUtil.generateRefreshToken(user.getId(), session.getId());
        session.setTokenHash(cryptoSecurityService.hash(refreshToken));
        refreshSessionRepository.save(session);

        String accessToken = jwtUtil.generateAccessToken(user.getId());
        return AuthResult.authenticated(message, accessToken, refreshToken, buildUserProfile(user));
    }

    private AuthDto.UserProfile buildUserProfile(User user) {
        AuthDto.UserProfile profile = new AuthDto.UserProfile();
        profile.setId(user.getId());
        profile.setName(user.getName());
        profile.setEmail(user.getEmail());
        profile.setAvatarUrl(user.getAvatarUrl());
        profile.setAuthProvider(user.getAuthProvider());
        profile.setPrivacyModeEnabled(user.isPrivacyModeEnabled());
        profile.setEmailNotificationsEnabled(user.isEmailNotificationsEnabled());
        profile.setTwoFactorEnabled(user.isTwoFactorEnabled());
        profile.setPaperStartingBalance(user.getPaperStartingBalance());
        profile.setPaperCashBalance(user.getPaperCashBalance());
        profile.setWalletAddress(user.getWalletAddress());
        profile.setEmailVerified(user.isEmailVerified());
        profile.setWatchlistCount(user.getWatchlist() == null ? 0 : user.getWatchlist().size());
        profile.setAlertCount(user.getAlerts() == null ? 0 : user.getAlerts().size());
        return profile;
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.US);
    }

    @Getter
    public static class AuthResult {
        private final String message;
        private final String accessToken;
        private final String refreshToken;
        private final AuthDto.UserProfile user;
        private final boolean twoFactorRequired;

        private AuthResult(String message, String accessToken, String refreshToken,
                           AuthDto.UserProfile user, boolean twoFactorRequired) {
            this.message = message;
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.user = user;
            this.twoFactorRequired = twoFactorRequired;
        }

        public static AuthResult authenticated(String message, String accessToken, String refreshToken,
                                               AuthDto.UserProfile user) {
            return new AuthResult(message, accessToken, refreshToken, user, false);
        }

        public static AuthResult twoFactorRequired(AuthDto.UserProfile user) {
            return new AuthResult("Two-factor authentication required", null, null, user, true);
        }
    }
}
