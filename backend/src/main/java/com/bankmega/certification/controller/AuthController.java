package com.bankmega.certification.controller;

import com.bankmega.certification.dto.LoginRequest;
import com.bankmega.certification.dto.LoginResponse;
import com.bankmega.certification.dto.FirstLoginChangePasswordRequest;
import com.bankmega.certification.dto.ForgotPasswordRequest;
import com.bankmega.certification.dto.ResetPasswordRequest;
import com.bankmega.certification.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    // ================= LOGIN ================= //

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse resp = authService.login(request);
        return ResponseEntity.ok(resp);
    }

    // ================= FORGOT / RESET PASSWORD ================= //

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        boolean success = authService.forgotPassword(req);

        if (success) {
            return ResponseEntity.ok(
                    Map.of(
                            "success", true,
                            "message", "Akun ditemukan, email telah dikirim"));
        } else {
            // TETAP 200, tapi success=false
            return ResponseEntity.ok(
                    Map.of(
                            "success", false,
                            "message", "Akun tidak ditemukan"));
        }
    }

    @GetMapping("/reset-password/validate")
    public ResponseEntity<Map<String, Object>> validateResetToken(@RequestParam("token") String token) {
        boolean valid = authService.validateResetToken(token);
        return ResponseEntity.ok(Map.of("valid", valid));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req);
        return ResponseEntity.ok(
                Map.of("message", "Password berhasil diubah"));
    }

    // ================= FIRST LOGIN CHANGE PASSWORD ================= //

    @PostMapping("/change-password-first-login")
    public ResponseEntity<?> changePasswordFirstLogin(
            @Valid @RequestBody FirstLoginChangePasswordRequest req) {

        authService.changePasswordFirstLogin(req);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Password berhasil diubah",
                        "isFirstLogin", false));
    }
}
