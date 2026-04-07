package com.coinvista.backend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.access-expiration}")
    private long accessTokenExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshTokenExpiration;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(String userId) {
        return buildToken(userId, accessTokenExpiration, Map.of("type", "access"));
    }

    public String generateRefreshToken(String userId, String sessionId) {
        return buildToken(userId, refreshTokenExpiration, Map.of("type", "refresh", "sid", sessionId));
    }

    public String extractUserId(String token) {
        return extractClaims(token).getPayload().getSubject();
    }

    public String extractTokenType(String token) {
        Object type = extractClaims(token).getPayload().get("type");
        return type == null ? "" : type.toString();
    }

    public String extractSessionId(String token) {
        Object sessionId = extractClaims(token).getPayload().get("sid");
        return sessionId == null ? "" : sessionId.toString();
    }

    public boolean validateAccessToken(String token) {
        return validateToken(token, "access");
    }

    public boolean validateRefreshToken(String token) {
        return validateToken(token, "refresh");
    }

    public boolean validateToken(String token, String expectedType) {
        try {
            String tokenType = extractTokenType(token);
            return expectedType.equals(tokenType);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    private String buildToken(String userId, long expirationMs, Map<String, Object> claims) {
        return Jwts.builder()
                .claims(claims)
                .subject(userId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    private Jws<Claims> extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token);
    }
}
