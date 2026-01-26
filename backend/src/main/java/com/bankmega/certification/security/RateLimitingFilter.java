package com.bankmega.certification.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple rate limiting filter for authentication endpoints.
 * Uses sliding window counter algorithm without external dependencies.
 */
@Slf4j
@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    // Track request counts per IP with timestamp
    private final Map<String, RequestCounter> requestCounters = new ConcurrentHashMap<>();

    // Configurable rate limit: max requests per time window
    @Value("${app.rate-limit.auth.requests:10}")
    private int maxRequests;

    @Value("${app.rate-limit.auth.duration-seconds:60}")
    private int durationSeconds;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {
        String path = request.getRequestURI();
        // Only rate limit auth endpoints
        return !path.startsWith("/api/auth/");
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String clientIp = getClientIP(request);

        // Clean up expired entries periodically
        cleanupExpiredEntries();

        RequestCounter counter = requestCounters.computeIfAbsent(clientIp,
                k -> new RequestCounter(Instant.now()));

        // Reset counter if time window has passed
        if (counter.isExpired(durationSeconds)) {
            counter.reset();
        }

        int currentCount = counter.incrementAndGet();

        if (currentCount <= maxRequests) {
            // Request allowed
            filterChain.doFilter(request, response);
        } else {
            // Rate limit exceeded
            log.warn("Rate limit exceeded for IP: {} on path: {} (attempt {} of {})",
                    clientIp, request.getRequestURI(), currentCount, maxRequests);

            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("""
                    {
                        "status": 429,
                        "error": "Too Many Requests",
                        "message": "Terlalu banyak percobaan. Silakan tunggu beberapa saat."
                    }
                    """);
        }
    }

    private String getClientIP(HttpServletRequest request) {
        // Check for forwarded headers (behind proxy/load balancer)
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Take the first IP in the chain
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }

    private void cleanupExpiredEntries() {
        // Remove entries older than 2x duration to prevent memory leak
        long thresholdSeconds = durationSeconds * 2L;
        requestCounters.entrySet().removeIf(entry -> entry.getValue().isExpired((int) thresholdSeconds));
    }

    /**
     * Simple counter with timestamp for rate limiting
     */
    private static class RequestCounter {
        private volatile Instant windowStart;
        private final AtomicInteger count = new AtomicInteger(0);

        RequestCounter(Instant windowStart) {
            this.windowStart = windowStart;
        }

        boolean isExpired(int durationSeconds) {
            return Instant.now().isAfter(windowStart.plusSeconds(durationSeconds));
        }

        void reset() {
            this.windowStart = Instant.now();
            this.count.set(0);
        }

        int incrementAndGet() {
            return count.incrementAndGet();
        }
    }
}
