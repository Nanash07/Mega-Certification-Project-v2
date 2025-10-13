// src/main/java/com/bankmega/certification/controller/EmailConfigController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmailConfigRequestDTO;
import com.bankmega.certification.dto.EmailConfigResponseDTO;
import com.bankmega.certification.service.EmailConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/email-config")
@RequiredArgsConstructor
public class EmailConfigController {

    private final EmailConfigService emailConfigService;

    /**
     * Ambil konfigurasi email aktif
     */
    @GetMapping("/active")
    public ResponseEntity<EmailConfigResponseDTO> getActiveConfig() {
        EmailConfigResponseDTO activeConfig = emailConfigService.getActiveConfig();
        return ResponseEntity.ok(activeConfig);
    }

    /**
     * Ambil semua konfigurasi email
     */
    @GetMapping
    public ResponseEntity<List<EmailConfigResponseDTO>> getAllConfigs() {
        List<EmailConfigResponseDTO> configs = emailConfigService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    /**
     * Simpan konfigurasi baru dan aktifkan
     */
    @PostMapping
    public ResponseEntity<EmailConfigResponseDTO> saveConfig(@RequestBody EmailConfigRequestDTO request) {
        EmailConfigResponseDTO savedConfig = emailConfigService.saveConfig(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedConfig);
    }

    /**
     * Test kirim email menggunakan konfigurasi aktif
     */
    @PostMapping("/test")
    public ResponseEntity<String> testConnection(@RequestParam String to) {
        try {
            emailConfigService.testConnection(to);
            return ResponseEntity.ok("Test email berhasil dikirim ke " + to);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Gagal mengirim test email: " + e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Terjadi kesalahan saat mengirim test email: " + e.getMessage());
        }
    }
}
