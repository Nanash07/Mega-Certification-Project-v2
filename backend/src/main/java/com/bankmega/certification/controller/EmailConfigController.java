// src/main/java/com/bankmega/certification/controller/EmailConfigController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmailConfigRequestDTO;
import com.bankmega.certification.dto.EmailConfigResponseDTO;
import com.bankmega.certification.dto.TestEmailRequest;
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

    @GetMapping("/active")
    public ResponseEntity<EmailConfigResponseDTO> getActiveConfig() {
        EmailConfigResponseDTO activeConfig = emailConfigService.getActiveConfig();
        return ResponseEntity.ok(activeConfig);
    }

    @GetMapping
    public ResponseEntity<List<EmailConfigResponseDTO>> getAllConfigs() {
        List<EmailConfigResponseDTO> configs = emailConfigService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    @PostMapping
    public ResponseEntity<EmailConfigResponseDTO> saveConfig(@RequestBody EmailConfigRequestDTO request) {
        EmailConfigResponseDTO savedConfig = emailConfigService.saveConfig(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedConfig);
    }

    @PostMapping("/test")
    public ResponseEntity<String> testConnection(@RequestBody TestEmailRequest req) {
        try {
            emailConfigService.testConnection(req.getEmail(), req.getSubject(), req.getMessage());
            return ResponseEntity.ok("Test email berhasil dikirim ke " + req.getEmail());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }
    }
}
