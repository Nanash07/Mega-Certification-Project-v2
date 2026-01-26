package com.bankmega.certification.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("JwtUtil Tests")
class JwtUtilTest {

    private JwtUtil jwtUtil;

    private static final String TEST_USERNAME = "testuser";
    private static final String TEST_ROLE = "SUPERADMIN";
    private static final Long TEST_USER_ID = 1L;
    private static final Long TEST_EMPLOYEE_ID = 100L;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        // Set a test secret
        ReflectionTestUtils.setField(jwtUtil, "secret", "TestSecretKeyForJwtTesting12345678!");
        // Initialize the component
        jwtUtil.init();
    }

    @Test
    @DisplayName("Should generate valid token")
    void generateToken_ShouldCreateValidToken() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        assertNotNull(token);
        assertFalse(token.isEmpty());
        assertTrue(token.split("\\.").length == 3); // JWT has 3 parts
    }

    @Test
    @DisplayName("Should extract username from token")
    void getUsername_ShouldReturnCorrectUsername() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        String extractedUsername = JwtUtil.getUsername(token);

        assertEquals(TEST_USERNAME, extractedUsername);
    }

    @Test
    @DisplayName("Should extract role from token")
    void getRole_ShouldReturnCorrectRole() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        String extractedRole = JwtUtil.getRole(token);

        assertEquals(TEST_ROLE, extractedRole);
    }

    @Test
    @DisplayName("Should extract userId from token")
    void getUserId_ShouldReturnCorrectUserId() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        Long extractedUserId = JwtUtil.getUserId(token);

        assertEquals(TEST_USER_ID, extractedUserId);
    }

    @Test
    @DisplayName("Should extract employeeId from token")
    void getEmployeeId_ShouldReturnCorrectEmployeeId() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        Long extractedEmployeeId = JwtUtil.getEmployeeId(token);

        assertEquals(TEST_EMPLOYEE_ID, extractedEmployeeId);
    }

    @Test
    @DisplayName("Should validate token with correct username")
    void isValid_WithCorrectUsername_ShouldReturnTrue() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        boolean isValid = JwtUtil.isValid(token, TEST_USERNAME);

        assertTrue(isValid);
    }

    @Test
    @DisplayName("Should invalidate token with wrong username")
    void isValid_WithWrongUsername_ShouldReturnFalse() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        boolean isValid = JwtUtil.isValid(token, "wronguser");

        assertFalse(isValid);
    }

    @Test
    @DisplayName("Should return false for malformed token")
    void isValid_WithMalformedToken_ShouldReturnFalse() {
        boolean isValid = JwtUtil.isValid("not.a.valid.token", TEST_USERNAME);

        assertFalse(isValid);
    }

    @Test
    @DisplayName("Token expiration should be in the future")
    void getExpiration_ShouldBeInFuture() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, TEST_EMPLOYEE_ID);

        java.util.Date expiration = JwtUtil.getExpiration(token);

        assertTrue(expiration.after(new java.util.Date()));
    }

    @Test
    @DisplayName("Should handle null employeeId in token")
    void generateToken_WithNullEmployeeId_ShouldWork() {
        String token = JwtUtil.generateToken(TEST_USERNAME, TEST_ROLE, TEST_USER_ID, null);

        assertNotNull(token);
        assertTrue(JwtUtil.isValid(token, TEST_USERNAME));
        assertNull(JwtUtil.getEmployeeId(token));
    }
}
