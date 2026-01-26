package com.bankmega.certification.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.Getter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    // Backward-compatible default for local development
    private static final String DEFAULT_SECRET = "B4nKMegaGantengP4keJwTSecretKey123!!XXSecureKey";
    private static final long EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 jam

    @Value("${app.jwt.secret:" + DEFAULT_SECRET + "}")
    private String secret;

    @Getter
    private SecretKey secretKey;

    // Static instance untuk backward compatibility
    private static JwtUtil instance;

    @PostConstruct
    public void init() {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        instance = this;
    }

    // Static methods untuk backward compatibility dengan code existing
    private static SecretKey getKey() {
        if (instance == null || instance.secretKey == null) {
            // Fallback untuk skenario dimana Spring belum initialize
            return Keys.hmacShaKeyFor(DEFAULT_SECRET.getBytes());
        }
        return instance.secretKey;
    }

    private static Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public static <T> T extractClaim(String token, Function<Claims, T> resolver) {
        return resolver.apply(extractAllClaims(token));
    }

    public static String getUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public static String getRole(String token) {
        return extractClaim(token, c -> c.get("role", String.class));
    }

    public static Long getUserId(String token) {
        return extractClaim(token, c -> c.get("userId", Long.class));
    }

    public static Long getEmployeeId(String token) {
        return extractClaim(token, c -> c.get("employeeId", Long.class));
    }

    public static Date getExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public static String generateToken(String username,
            String role,
            Long userId,
            Long employeeId) {

        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .claim("userId", userId)
                .claim("employeeId", employeeId)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRATION_MS))
                .signWith(getKey())
                .compact();
    }

    public static boolean isValid(String token, String username) {
        try {
            String usernameInToken = getUsername(token);
            boolean notExpired = getExpiration(token).after(new Date());
            return username.equals(usernameInToken) && notExpired;
        } catch (Exception e) {
            return false;
        }
    }
}
