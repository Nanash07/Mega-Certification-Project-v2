package com.bankmega.certification.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RateLimitingFilter Tests")
class RateLimitingFilterTest {

    private RateLimitingFilter filter;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    @Mock
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        filter = new RateLimitingFilter();
        ReflectionTestUtils.setField(filter, "maxRequests", 3);
        ReflectionTestUtils.setField(filter, "durationSeconds", 60);
    }

    @Test
    @DisplayName("Should allow requests within rate limit")
    void withinRateLimit_ShouldAllow() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.1");

        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        verify(filterChain, times(3)).doFilter(request, response);
    }

    @Test
    @DisplayName("Should block requests exceeding rate limit")
    void exceedingRateLimit_ShouldBlock() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        when(request.getRemoteAddr()).thenReturn("192.168.1.2");

        StringWriter stringWriter = new StringWriter();
        PrintWriter writer = new PrintWriter(stringWriter);
        when(response.getWriter()).thenReturn(writer);

        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(3)).doFilter(request, response);
        verify(response).setStatus(429);
    }

    @Test
    @DisplayName("Should not filter non-auth endpoints")
    void nonAuthEndpoint_ShouldNotFilter() {
        when(request.getRequestURI()).thenReturn("/api/employees");
        assertTrue(filter.shouldNotFilter(request));
    }

    @Test
    @DisplayName("Should filter auth endpoints")
    void authEndpoint_ShouldFilter() {
        when(request.getRequestURI()).thenReturn("/api/auth/login");
        assertFalse(filter.shouldNotFilter(request));
    }

    @Test
    @DisplayName("Different IPs should have separate rate limits")
    void differentIPs_ShouldHaveSeparateLimits() throws Exception {
        when(request.getRequestURI()).thenReturn("/api/auth/login");

        when(request.getRemoteAddr()).thenReturn("192.168.1.10");
        for (int i = 0; i < 3; i++) {
            filter.doFilterInternal(request, response, filterChain);
        }

        when(request.getRemoteAddr()).thenReturn("192.168.1.20");
        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, times(4)).doFilter(request, response);
    }
}
