package com.bankmega.certification.service;

import com.bankmega.certification.dto.LoginRequest;
import com.bankmega.certification.dto.LoginResponse;
import com.bankmega.certification.dto.FirstLoginChangePasswordRequest;
import com.bankmega.certification.dto.ForgotPasswordRequest;
import com.bankmega.certification.dto.ResetPasswordRequest;
import com.bankmega.certification.entity.Role;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService Tests")
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetService passwordResetService;

    @InjectMocks
    private AuthService authService;

    private User activeUser;
    private Role superadminRole;

    @BeforeEach
    void setUp() {
        // Initialize JwtUtil for token generation
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "TestSecretForAuthServiceTests12345!");
        jwtUtil.init();

        // Create test role
        superadminRole = new Role();
        superadminRole.setId(1L);
        superadminRole.setName("SUPERADMIN");

        // Create test user with hashed password
        String hashedPassword = BCrypt.hashpw("TestPassword123", BCrypt.gensalt());
        activeUser = new User();
        activeUser.setId(1L);
        activeUser.setUsername("testuser");
        activeUser.setPassword(hashedPassword);
        activeUser.setIsActive(true);
        activeUser.setRole(superadminRole);
        activeUser.setIsFirstLogin(false);
    }

    // ================= LOGIN TESTS ================= //

    @Test
    @DisplayName("Login with valid credentials should return LoginResponse")
    void login_WithValidCredentials_ShouldReturnResponse() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("TestPassword123");

        when(userRepository.findByUsernameAndDeletedAtIsNull("testuser"))
                .thenReturn(Optional.of(activeUser));

        LoginResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("testuser", response.getUsername());
        assertEquals("SUPERADMIN", response.getRole());
        assertNotNull(response.getToken());
        assertFalse(response.getToken().isEmpty());
    }

    @Test
    @DisplayName("Login with null username should throw BAD_REQUEST")
    void login_WithNullUsername_ShouldThrowBadRequest() {
        LoginRequest request = new LoginRequest();
        request.setUsername(null);
        request.setPassword("password");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    @DisplayName("Login with blank password should throw BAD_REQUEST")
    void login_WithBlankPassword_ShouldThrowBadRequest() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("   ");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    @DisplayName("Login with non-existent user should throw UNAUTHORIZED")
    void login_WithNonExistentUser_ShouldThrowUnauthorized() {
        LoginRequest request = new LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password");

        when(userRepository.findByUsernameAndDeletedAtIsNull("nonexistent"))
                .thenReturn(Optional.empty());

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(401, exception.getStatusCode().value());
    }

    @Test
    @DisplayName("Login with wrong password should throw UNAUTHORIZED")
    void login_WithWrongPassword_ShouldThrowUnauthorized() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        when(userRepository.findByUsernameAndDeletedAtIsNull("testuser"))
                .thenReturn(Optional.of(activeUser));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(401, exception.getStatusCode().value());
    }

    @Test
    @DisplayName("Login with inactive user should throw FORBIDDEN")
    void login_WithInactiveUser_ShouldThrowForbidden() {
        activeUser.setIsActive(false);

        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("TestPassword123");

        when(userRepository.findByUsernameAndDeletedAtIsNull("testuser"))
                .thenReturn(Optional.of(activeUser));

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.login(request));

        assertEquals(403, exception.getStatusCode().value());
    }

    // ================= FORGOT PASSWORD TESTS ================= //

    @Test
    @DisplayName("Forgot password with valid email should call passwordResetService")
    void forgotPassword_WithValidEmail_ShouldCallResetService() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@example.com");

        when(passwordResetService.requestReset("test@example.com", null))
                .thenReturn(true);

        boolean result = authService.forgotPassword(request);

        assertTrue(result);
        verify(passwordResetService).requestReset("test@example.com", null);
    }

    @Test
    @DisplayName("Forgot password without email or username should throw BAD_REQUEST")
    void forgotPassword_WithoutEmailOrUsername_ShouldThrowBadRequest() {
        ForgotPasswordRequest request = new ForgotPasswordRequest();

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.forgotPassword(request));

        assertEquals(400, exception.getStatusCode().value());
    }

    // ================= RESET PASSWORD TESTS ================= //

    @Test
    @DisplayName("Reset password with valid token and password should succeed")
    void resetPassword_WithValidRequest_ShouldSucceed() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("NewPassword123");

        assertDoesNotThrow(() -> authService.resetPassword(request));
        verify(passwordResetService).resetPassword("valid-token", "NewPassword123");
    }

    @Test
    @DisplayName("Reset password with null token should throw BAD_REQUEST")
    void resetPassword_WithNullToken_ShouldThrowBadRequest() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken(null);
        request.setNewPassword("NewPassword123");

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> authService.resetPassword(request));

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    @DisplayName("Reset password with weak password should throw from validator")
    void resetPassword_WithWeakPassword_ShouldThrowFromValidator() {
        ResetPasswordRequest request = new ResetPasswordRequest();
        request.setToken("valid-token");
        request.setNewPassword("weak"); // Too short, no uppercase, no digit

        assertThrows(Exception.class, () -> authService.resetPassword(request));
    }
}
