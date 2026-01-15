package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeEligibilityExceptionRequest;
import com.bankmega.certification.dto.EmployeeEligibilityExceptionResponse;
import com.bankmega.certification.dto.EmployeeEligibilityExceptionImportResponse;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.service.EmployeeEligibilityExceptionImportService;
import com.bankmega.certification.service.EmployeeEligibilityExceptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/exceptions")
@RequiredArgsConstructor
public class EmployeeEligibilityExceptionController {

    private final EmployeeEligibilityExceptionService exceptionService;
    private final EmployeeEligibilityExceptionImportService importService;
    private final UserRepository userRepo;
    private final PicCertificationScopeRepository scopeRepo;

    private boolean isPic(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return "PIC".equalsIgnoreCase(r) || "ROLE_PIC".equalsIgnoreCase(r);
        });
    }

    private Long extractUserId(Authentication auth, Long injectedUserId) {
        if (injectedUserId != null)
            return injectedUserId;
        if (auth == null)
            return null;

        Object principal = auth.getPrincipal();
        try {
            Method m = principal.getClass().getMethod("getId");
            Object v = m.invoke(principal);
            if (v instanceof Number n)
                return n.longValue();
        } catch (Exception ignore) {
        }
        return null;
    }

    private List<Long> resolveAllowedCertIds(Authentication authentication, Long userIdFromPrincipal) {
        if (!isPic(authentication))
            return null;

        Long uid = extractUserId(authentication, userIdFromPrincipal);
        if (uid == null)
            return List.of();

        return scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());
    }

    @GetMapping
    public ResponseEntity<Page<EmployeeEligibilityExceptionResponse>> getPaged(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> jobIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal,
            Pageable pageable) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            return ResponseEntity.ok(Page.empty(java.util.Objects.requireNonNull(pageable)));
        }

        List<String> effectiveStatuses = (statuses != null && !statuses.isEmpty()) ? statuses
                : (status != null && !status.isBlank()) ? List.of(status) : null;

        return ResponseEntity.ok(
                exceptionService.getPagedFiltered(
                        employeeIds, jobIds, certCodes, levels, subCodes,
                        effectiveStatuses, search,
                        allowedCertIds,
                        pageable));
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> jobIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            byte[] empty = exceptionService.exportExcel(
                    employeeIds, jobIds, certCodes, levels, subCodes,
                    (statuses != null && !statuses.isEmpty()) ? statuses
                            : (status != null && !status.isBlank() ? List.of(status) : null),
                    search,
                    allowedCertIds);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename("exceptions-empty.xlsx")
                            .build().toString())
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(empty);
        }

        byte[] bytes = exceptionService.exportExcel(
                employeeIds, jobIds, certCodes, levels, subCodes,
                (statuses != null && !statuses.isEmpty()) ? statuses
                        : (status != null && !status.isBlank() ? List.of(status) : null),
                search,
                allowedCertIds);

        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String filename = "employee-exceptions-" + today + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename)
                        .build().toString())
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
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
    public ResponseEntity<EmployeeEligibilityExceptionResponse> updateNotes(@PathVariable Long id,
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
