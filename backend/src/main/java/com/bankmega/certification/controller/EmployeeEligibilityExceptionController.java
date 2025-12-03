package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeEligibilityExceptionRequest;
import com.bankmega.certification.dto.EmployeeEligibilityExceptionResponse;
import com.bankmega.certification.dto.EmployeeEligibilityExceptionImportResponse;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.service.EmployeeEligibilityExceptionService;
import com.bankmega.certification.service.EmployeeEligibilityExceptionImportService;
import lombok.RequiredArgsConstructor;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/exceptions")
@RequiredArgsConstructor
public class EmployeeEligibilityExceptionController {

    private final EmployeeEligibilityExceptionService exceptionService;
    private final EmployeeEligibilityExceptionImportService importService;
    private final UserRepository userRepo;

    // ===================== CRUD =====================

    @GetMapping
    public ResponseEntity<Page<EmployeeEligibilityExceptionResponse>> getPaged(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> jobIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Pageable pageable) {
        return ResponseEntity.ok(
                exceptionService.getPagedFiltered(employeeIds, jobIds, certCodes, levels, subCodes, status, search,
                        pageable));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeEligibilityExceptionResponse>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(exceptionService.getByEmployee(employeeId));
    }

    @PostMapping
    public ResponseEntity<EmployeeEligibilityExceptionResponse> create(
            @RequestBody EmployeeEligibilityExceptionRequest req) {
        return ResponseEntity.ok(
                exceptionService.create(req.getEmployeeId(), req.getCertificationRuleId(), req.getNotes()));
    }

    @PutMapping("/{id}/notes")
    public ResponseEntity<EmployeeEligibilityExceptionResponse> updateNotes(
            @PathVariable Long id,
            @RequestParam String notes) {
        return ResponseEntity.ok(exceptionService.updateNotes(id, notes));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<EmployeeEligibilityExceptionResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(exceptionService.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        exceptionService.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    // ===================== IMPORT =====================

    @GetMapping("/import/template")
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        return importService.downloadTemplate();
    }

    @PostMapping("/import/dry-run")
    public ResponseEntity<EmployeeEligibilityExceptionImportResponse> dryRun(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails principal) throws Exception {
        User userEntity = userRepo.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(importService.dryRun(file, userEntity));
    }

    @PostMapping("/import/confirm")
    public ResponseEntity<EmployeeEligibilityExceptionImportResponse> confirm(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails principal) throws Exception {
        User userEntity = userRepo.findByUsername(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(importService.confirm(file, userEntity));
    }
}