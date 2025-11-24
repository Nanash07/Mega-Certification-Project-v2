package com.bankmega.certification.controller;

import com.bankmega.certification.dto.LoginRequest;
import com.bankmega.certification.dto.LoginResponse;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.entity.Role;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {

        User user = userRepository.findByUsernameAndDeletedAtIsNull(request.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Username not found"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "User tidak aktif");
        }

        if (!BCrypt.checkpw(request.getPassword(), user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Password salah");
        }

        // --- ambil role dan employeeId
        Role role = user.getRole();
        String roleName = role != null ? role.getName() : null;

        Long employeeId = user.getEmployee() != null ? user.getEmployee().getId() : null;

        // --- generate JWT BARU (lengkap)
        String token = JwtUtil.generateToken(
                user.getUsername(),
                roleName,
                user.getId(),
                employeeId);

        // --- login response lengkap ke FE
        LoginResponse resp = LoginResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(roleName)
                .employeeId(employeeId)
                .isActive(user.getIsActive())
                .isFirstLogin(user.getIsFirstLogin())
                .token(token)
                .build();

        return ResponseEntity.ok(resp);
    }
}