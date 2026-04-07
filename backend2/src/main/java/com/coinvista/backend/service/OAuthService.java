package com.coinvista.backend.service;

import com.coinvista.backend.model.User;
import com.coinvista.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OAuthService {

    private static final String OAUTH_STATE_COOKIE = "coinvista_oauth_state";
    private static final String OAUTH_PROVIDER_COOKIE = "coinvista_oauth_provider";
    private static final String REFRESH_COOKIE = "coinvista_refresh";

    private final WebClient webClient = WebClient.builder().build();

    private final UserRepository userRepository;
    private final AuthService authService;
    private final CryptoSecurityService cryptoSecurityService;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.api.base-url}")
    private String apiBaseUrl;

    @Value("${app.oauth.google.client-id:}")
    private String googleClientId;

    @Value("${app.oauth.google.client-secret:}")
    private String googleClientSecret;

    @Value("${app.oauth.github.client-id:}")
    private String githubClientId;

    @Value("${app.oauth.github.client-secret:}")
    private String githubClientSecret;

    @Value("${app.oauth.facebook.client-id:}")
    private String facebookClientId;

    @Value("${app.oauth.facebook.client-secret:}")
    private String facebookClientSecret;

    @Value("${app.oauth.facebook.version:v20.0}")
    private String facebookVersion;

    public void start(String provider, HttpServletResponse response) throws IOException {
        validateProvider(provider);

        String state = cryptoSecurityService.generateUrlSafeToken();
        writeCookie(response, OAUTH_STATE_COOKIE, state, Duration.ofMinutes(10), true);
        writeCookie(response, OAUTH_PROVIDER_COOKIE, provider.toLowerCase(Locale.US), Duration.ofMinutes(10), true);
        response.sendRedirect(buildAuthorizationUrl(provider, state));
    }

    public AuthService.AuthResult handleCallback(String provider, String code, String state, HttpServletRequest request) {
        validateProvider(provider);
        validateState(provider, state, request);

        OAuthProfile profile = switch (provider.toLowerCase(Locale.US)) {
            case "google" -> fetchGoogleProfile(code);
            case "github" -> fetchGitHubProfile(code);
            case "facebook" -> fetchFacebookProfile(code);
            default -> throw new IllegalArgumentException("Unsupported OAuth provider");
        };

        User user = findOrCreateUser(provider, profile);
        return authService.createSessionForUser(user, request.getHeader("User-Agent"), request.getRemoteAddr(),
                "Signed in with " + provider.substring(0, 1).toUpperCase(Locale.US) + provider.substring(1).toLowerCase(Locale.US));
    }

    public String getFrontendSuccessRedirect(String provider) {
        return frontendBaseUrl + "/dashboard?oauth=success&provider=" + provider;
    }

    public String getFrontendErrorRedirect(String provider, String message) {
        return frontendBaseUrl + "/login?oauth=error&provider=" + provider + "&message=" + UriComponentsBuilder.newInstance()
                .queryParam("m", message)
                .build()
                .getQueryParams()
                .getFirst("m");
    }

    public void clearOAuthCookies(HttpServletResponse response) {
        writeCookie(response, OAUTH_STATE_COOKIE, "", Duration.ZERO, true);
        writeCookie(response, OAUTH_PROVIDER_COOKIE, "", Duration.ZERO, true);
    }

    public void writeRefreshCookie(HttpServletResponse response, String refreshToken) {
        writeCookie(response, REFRESH_COOKIE, refreshToken, Duration.ofDays(30), true);
    }

    private User findOrCreateUser(String provider, OAuthProfile profile) {
        Optional<User> byProvider = userRepository.findByAuthProviderAndProviderId(provider.toLowerCase(Locale.US), profile.providerId());
        if (byProvider.isPresent()) {
            User user = byProvider.get();
            user.setName(profile.name());
            user.setAvatarUrl(profile.avatarUrl());
            user.setEmailVerified(profile.emailVerified());
            user.setUpdatedAt(Instant.now());
            return userRepository.save(user);
        }

        Optional<User> byEmail = profile.email() == null || profile.email().isBlank()
                ? Optional.empty()
                : userRepository.findByEmail(profile.email().toLowerCase(Locale.US));

        if (byEmail.isPresent()) {
            User existing = byEmail.get();
            existing.setAuthProvider(provider.toLowerCase(Locale.US));
            existing.setProviderId(profile.providerId());
            existing.setAvatarUrl(profile.avatarUrl());
            existing.setEmailVerified(existing.isEmailVerified() || profile.emailVerified());
            existing.setUpdatedAt(Instant.now());
            return userRepository.save(existing);
        }

        User user = new User();
        user.setName(profile.name());
        user.setEmail(resolveEmail(provider, profile));
        user.setAuthProvider(provider.toLowerCase(Locale.US));
        user.setProviderId(profile.providerId());
        user.setAvatarUrl(profile.avatarUrl());
        user.setEmailVerified(profile.emailVerified());
        user.setUpdatedAt(Instant.now());
        return userRepository.save(user);
    }

    private String resolveEmail(String provider, OAuthProfile profile) {
        if (profile.email() != null && !profile.email().isBlank()) {
            return profile.email().toLowerCase(Locale.US);
        }
        return profile.providerId() + "@" + provider.toLowerCase(Locale.US) + ".coinvista.local";
    }

    private OAuthProfile fetchGoogleProfile(String code) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("code", code);
        formData.add("client_id", googleClientId);
        formData.add("client_secret", googleClientSecret);
        formData.add("redirect_uri", callbackUrl("google"));
        formData.add("grant_type", "authorization_code");

        Map<String, Object> tokenResponse = webClient.post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String accessToken = stringValue(tokenResponse.get("access_token"));
        Map<String, Object> userInfo = webClient.get()
                .uri("https://www.googleapis.com/oauth2/v3/userinfo")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        return new OAuthProfile(
                stringValue(userInfo.get("sub")),
                stringValue(userInfo.get("email")),
                stringValue(userInfo.get("name")),
                stringValue(userInfo.get("picture")),
                Boolean.parseBoolean(stringValue(userInfo.get("email_verified")))
        );
    }

    @SuppressWarnings("unchecked")
    private OAuthProfile fetchGitHubProfile(String code) {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("client_id", githubClientId);
        formData.add("client_secret", githubClientSecret);
        formData.add("code", code);
        formData.add("redirect_uri", callbackUrl("github"));

        Map<String, Object> tokenResponse = webClient.post()
                .uri("https://github.com/login/oauth/access_token")
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String accessToken = stringValue(tokenResponse.get("access_token"));
        Map<String, Object> userInfo = webClient.get()
                .uri("https://api.github.com/user")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String email = stringValue(userInfo.get("email"));
        if (email.isBlank()) {
            List<Map<String, Object>> emails = webClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .retrieve()
                    .bodyToMono(List.class)
                    .block();

            if (emails != null) {
                for (Map<String, Object> entry : emails) {
                    boolean primary = Boolean.parseBoolean(stringValue(entry.get("primary")));
                    boolean verified = Boolean.parseBoolean(stringValue(entry.get("verified")));
                    if (primary && verified) {
                        email = stringValue(entry.get("email"));
                        break;
                    }
                }
            }
        }

        return new OAuthProfile(
                stringValue(userInfo.get("id")),
                email,
                stringValue(userInfo.get("name")).isBlank() ? stringValue(userInfo.get("login")) : stringValue(userInfo.get("name")),
                stringValue(userInfo.get("avatar_url")),
                !email.isBlank()
        );
    }

    @SuppressWarnings("unchecked")
    private OAuthProfile fetchFacebookProfile(String code) {
        Map<String, Object> tokenResponse = webClient.get()
                .uri(UriComponentsBuilder.newInstance()
                        .scheme("https")
                        .host("graph.facebook.com")
                        .pathSegment(facebookVersion, "oauth", "access_token")
                        .queryParam("client_id", facebookClientId)
                        .queryParam("client_secret", facebookClientSecret)
                        .queryParam("redirect_uri", callbackUrl("facebook"))
                        .queryParam("code", code)
                        .toUriString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String accessToken = stringValue(tokenResponse.get("access_token"));
        Map<String, Object> userInfo = webClient.get()
                .uri(UriComponentsBuilder.newInstance()
                        .scheme("https")
                        .host("graph.facebook.com")
                        .path("/me")
                        .queryParam("fields", "id,name,email,picture")
                        .queryParam("access_token", accessToken)
                        .toUriString())
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        String avatarUrl = "";
        Object picture = userInfo.get("picture");
        if (picture instanceof Map<?, ?> pictureMap) {
            Object data = ((Map<?, ?>) pictureMap).get("data");
            if (data instanceof Map<?, ?> dataMap) {
                avatarUrl = stringValue(dataMap.get("url"));
            }
        }

        return new OAuthProfile(
                stringValue(userInfo.get("id")),
                stringValue(userInfo.get("email")),
                stringValue(userInfo.get("name")),
                avatarUrl,
                !stringValue(userInfo.get("email")).isBlank()
        );
    }

    private void validateProvider(String provider) {
        switch (provider.toLowerCase(Locale.US)) {
            case "google" -> requireConfigured("Google", googleClientId, googleClientSecret);
            case "github" -> requireConfigured("GitHub", githubClientId, githubClientSecret);
            case "facebook" -> requireConfigured("Facebook", facebookClientId, facebookClientSecret);
            default -> throw new IllegalArgumentException("Unsupported OAuth provider");
        }
    }

    private void requireConfigured(String providerName, String clientId, String clientSecret) {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException(providerName + " OAuth credentials are not configured");
        }
    }

    private void validateState(String provider, String state, HttpServletRequest request) {
        String expectedState = readCookie(request, OAUTH_STATE_COOKIE);
        String expectedProvider = readCookie(request, OAUTH_PROVIDER_COOKIE);

        if (expectedState == null || !expectedState.equals(state)
                || expectedProvider == null || !expectedProvider.equalsIgnoreCase(provider)) {
            throw new SecurityException("OAuth state validation failed");
        }
    }

    private String buildAuthorizationUrl(String provider, String state) {
        return switch (provider.toLowerCase(Locale.US)) {
            case "google" -> UriComponentsBuilder.newInstance()
                    .scheme("https")
                    .host("accounts.google.com")
                    .path("/o/oauth2/v2/auth")
                    .queryParam("client_id", googleClientId)
                    .queryParam("redirect_uri", callbackUrl("google"))
                    .queryParam("response_type", "code")
                    .queryParam("scope", "openid email profile")
                    .queryParam("state", state)
                    .build()
                    .toUriString();
            case "github" -> UriComponentsBuilder.newInstance()
                    .scheme("https")
                    .host("github.com")
                    .path("/login/oauth/authorize")
                    .queryParam("client_id", githubClientId)
                    .queryParam("redirect_uri", callbackUrl("github"))
                    .queryParam("scope", "read:user user:email")
                    .queryParam("state", state)
                    .build()
                    .toUriString();
            case "facebook" -> UriComponentsBuilder.newInstance()
                    .scheme("https")
                    .host("www.facebook.com")
                    .pathSegment(facebookVersion, "dialog", "oauth")
                    .queryParam("client_id", facebookClientId)
                    .queryParam("redirect_uri", callbackUrl("facebook"))
                    .queryParam("scope", "email,public_profile")
                    .queryParam("state", state)
                    .build()
                    .toUriString();
            default -> throw new IllegalArgumentException("Unsupported OAuth provider");
        };
    }

    private String callbackUrl(String provider) {
        return apiBaseUrl + "/api/auth/oauth/" + provider + "/callback";
    }

    private void writeCookie(HttpServletResponse response, String name, String value, Duration duration, boolean httpOnly) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(httpOnly)
                .secure(true)
                .sameSite("Lax")
                .path("/")
                .maxAge(duration)
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
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

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private record OAuthProfile(String providerId, String email, String name, String avatarUrl, boolean emailVerified) {}
}
