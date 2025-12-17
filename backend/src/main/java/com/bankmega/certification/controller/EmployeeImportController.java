package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeImportLogResponse;
import com.bankmega.certification.dto.EmployeeImportResponse;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.service.EmployeeImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/employees/import")
@RequiredArgsConstructor
public class EmployeeImportController {

    private final EmployeeImportService importService;

    @PostMapping("/dry-run")
    public ResponseEntity<EmployeeImportResponse> dryRun(
            @RequestParam("file") MultipartFile file,
            Principal principal) throws Exception {

        User user = new User();
        user.setId(1L);
        user.setUsername(principal != null ? principal.getName() : "system");

        return ResponseEntity.ok(importService.dryRun(file, user));
    }

    @PostMapping("/confirm")
    public ResponseEntity<EmployeeImportResponse> confirm(
            @RequestParam("file") MultipartFile file,
            Principal principal) throws Exception {

        User user = new User();
        user.setId(1L);
        user.setUsername(principal != null ? principal.getName() : "system");

        return ResponseEntity.ok(importService.confirm(file, user));
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        return importService.downloadTemplate();
    }

    @GetMapping("/logs")
    public ResponseEntity<List<EmployeeImportLogResponse>> getAllLogs() {
        return ResponseEntity.ok(importService.getAllLogs());
    }

    @GetMapping("/logs/{userId}")
    public ResponseEntity<List<EmployeeImportLogResponse>> getLogsByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(importService.getLogsByUser(userId));
    }
}
