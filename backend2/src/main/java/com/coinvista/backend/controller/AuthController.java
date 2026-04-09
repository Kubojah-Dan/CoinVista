package com.coinvista.backend.controller;

import com.coinvista.backend.dto.AuthDto;
import com.coinvista.backend.model.User;
import com.coinvista.backend.service.AuthService;
import com.coinvista.backend.service.OAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String REFRESH_COOKIE = "coinvista_refresh";

    private final AuthService authService;
    private final OAuthService oAuthService;

    @PostMapping("/register")
    public ResponseEntity<AuthDto.AuthResponse> register(
            @Valid @RequestBody AuthDto.RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthService.AuthResult result = authService.register(request, httpRequest.getHeader("User-Agent"), httpRequest.getRemoteAddr());
        writeRefreshCookie(httpResponse, result.getRefreshToken(), false);
        return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(result));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthDto.AuthResponse> login(
            @Valid @RequestBody AuthDto.LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        AuthService.AuthResult result = authService.login(request, httpRequest.getHeader("User-Agent"), httpRequest.getRemoteAddr());
        if (result.isTwoFactorRequired()) {
            return ResponseEntity.status(HttpStatus.ACCEPTED).body(toResponse(result));
        }

        writeRefreshCookie(httpResponse, result.getRefreshToken(), false);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthDto.AuthResponse> refresh(
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String refreshToken = readCookie(httpRequest, REFRESH_COOKIE);
        AuthService.AuthResult result = authService.refreshSession(refreshToken, httpRequest.getHeader("User-Agent"), httpRequest.getRemoteAddr());
        writeRefreshCookie(httpResponse, result.getRefreshToken(), false);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        authService.logout(readCookie(httpRequest, REFRESH_COOKIE));
        writeRefreshCookie(httpResponse, "", true);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthDto.UserProfile> me(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.getProfile(user));
    }

    @PatchMapping("/settings")
    public ResponseEntity<AuthDto.UserProfile> updateSettings(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AuthDto.UpdateSettingsRequest request) {
        return ResponseEntity.ok(authService.updateSettings(user.getId(), request));
    }

    @PostMapping("/2fa/setup")
    public ResponseEntity<AuthDto.TwoFactorSetupResponse> setupTwoFactor(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(authService.setupTwoFactor(user.getId()));
    }

    @PostMapping("/2fa/verify")
    public ResponseEntity<AuthDto.UserProfile> verifyTwoFactor(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AuthDto.TotpCodeRequest request) {
        return ResponseEntity.ok(authService.verifyTwoFactorSetup(user.getId(), request.getCode()));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<AuthDto.UserProfile> disableTwoFactor(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AuthDto.TotpCodeRequest request) {
        return ResponseEntity.ok(authService.disableTwoFactor(user.getId(), request.getCode()));
    }

    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal User user,
            HttpServletResponse httpResponse) {
        authService.deleteAccount(user.getId());
        writeRefreshCookie(httpResponse, "", true);
        return ResponseEntity.ok(Map.of("message", "Account deleted successfully"));
    }

    @GetMapping("/oauth/{provider}/start")
    public void startOAuth(@PathVariable String provider, HttpServletResponse response) throws java.io.IOException {
        oAuthService.start(provider, response);
    }

    @GetMapping("/oauth/{provider}/callback")
    public void handleOAuthCallback(
            @PathVariable String provider,
            @RequestParam String code,
            @RequestParam String state,
            HttpServletRequest request,
            HttpServletResponse response) throws java.io.IOException {
        try {
            AuthService.AuthResult result = oAuthService.handleCallback(provider, code, state, request);
            oAuthService.writeRefreshCookie(response, result.getRefreshToken());
            oAuthService.clearOAuthCookies(response);
            response.sendRedirect(oAuthService.getFrontendSuccessRedirect(provider));
        } catch (Exception exception) {
            oAuthService.clearOAuthCookies(response);
            response.sendRedirect(oAuthService.getFrontendErrorRedirect(provider, exception.getMessage()));
        }
    }

    private AuthDto.AuthResponse toResponse(AuthService.AuthResult result) {
        AuthDto.AuthResponse response = new AuthDto.AuthResponse();
        response.setMessage(result.getMessage());
        response.setAccessToken(result.getAccessToken());
        response.setTwoFactorRequired(result.isTwoFactorRequired());
        response.setUser(result.getUser());
        return response;
    }

    private void writeRefreshCookie(HttpServletResponse response, String value, boolean clear) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(true)          // Required for SameSite=None and HTTPS production
                .sameSite("None")      // Required for cross-origin cookie delivery (frontend ≠ backend domain)
                .path("/")
                .maxAge(clear ? Duration.ZERO : Duration.ofDays(30))
                .build();
        response.addHeader("Set-Cookie", cookie.toString());
    }

    private String readCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> name.equals(cookie.getName()))
                .map(cookie -> cookie.getValue())
                .findFirst()
                .orElse(null);
    }
}
