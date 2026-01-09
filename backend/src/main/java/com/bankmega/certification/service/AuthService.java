package com.bankmega.certification.service;

import com.bankmega.certification.dto.FirstLoginChangePasswordRequest;
import com.bankmega.certification.dto.ForgotPasswordRequest;
import com.bankmega.certification.dto.LoginRequest;
import com.bankmega.certification.dto.LoginResponse;
import com.bankmega.certification.dto.ResetPasswordRequest;
import com.bankmega.certification.entity.Role;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordResetService passwordResetService;

    public LoginResponse login(LoginRequest request) {
        if (request == null || request.getUsername() == null || request.getUsername().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username wajib diisi");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password wajib diisi");
        }

        User user = userRepository.findByUsernameAndDeletedAtIsNull(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Username not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User tidak aktif");
        }

        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password salah");
        }

        Role role = user.getRole();
        String roleName = role != null ? role.getName() : null;
        Long employeeId = user.getEmployee() != null ? user.getEmployee().getId() : null;

        String token = JwtUtil.generateToken(
                user.getUsername(),
                roleName,
                user.getId(),
                employeeId);

        return LoginResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getResolvedEmail())
                .role(roleName)
                .employeeId(employeeId)
                .isActive(user.getIsActive())
                .isFirstLogin(user.getIsFirstLogin())
                .token(token)
                .build();
    }

    public boolean forgotPassword(ForgotPasswordRequest req) {
        String email = trimToNull(req != null ? req.getEmail() : null);
        String username = trimToNull(req != null ? req.getUsername() : null);

        if (email == null && username == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email atau username wajib diisi");
        }
        return passwordResetService.requestReset(email, username);
    }

    public boolean validateResetToken(String token) {
        return passwordResetService.validateToken(token);
    }

    public void resetPassword(ResetPasswordRequest req) {
        if (req == null || req.getToken() == null || req.getToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token wajib diisi");
        }
        if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password baru wajib diisi");
        }
        if (req.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password baru minimal 6 karakter");
        }

        passwordResetService.resetPassword(req.getToken(), req.getNewPassword());
    }

    // ================= FIRST LOGIN CHANGE PASSWORD ================= //

    public void changePasswordFirstLogin(FirstLoginChangePasswordRequest req) {
        if (req == null || req.getUsername() == null || req.getUsername().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username wajib diisi");
        }
        if (req.getNewPassword() == null || req.getNewPassword().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password baru wajib diisi");
        }
        if (req.getNewPassword().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password baru minimal 6 karakter");
        }

        User user = userRepository.findByUsernameAndDeletedAtIsNull(req.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User tidak ditemukan"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User tidak aktif");
        }

        if (user.getRole() != null &&
                user.getRole().getName() != null &&
                !"PEGAWAI".equalsIgnoreCase(user.getRole().getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Hanya pegawai yang wajib ganti password awal");
        }

        if (!Boolean.TRUE.equals(user.getIsFirstLogin())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "User tidak dalam status first login");
        }

        String hashed = BCrypt.hashpw(req.getNewPassword(), BCrypt.gensalt());
        user.setPassword(hashed);
        user.setIsFirstLogin(false);
        user.setUpdatedAt(Instant.now());

        userRepository.save(user);
    }

    // ================= UTIL ================= //

    private String trimToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
