// src/main/java/com/bankmega/certification/controller/EmployeeCertificationController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeCertificationRequest;
import com.bankmega.certification.dto.EmployeeCertificationResponse;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.service.EmployeeCertificationHistoryService;
import com.bankmega.certification.service.EmployeeCertificationService;
import com.bankmega.certification.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee-certifications")
@RequiredArgsConstructor
public class EmployeeCertificationController {

    private final EmployeeCertificationService service;
    private final FileStorageService fileStorageService;
    private final EmployeeCertificationHistoryService historyService;
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
            if (v instanceof Number)
                return ((Number) v).longValue();
        } catch (Exception ignore) {
        }
        return null;
    }

    private List<Long> resolveAllowedCertIds(Authentication authentication, Long userIdFromPrincipal) {
        if (!isPic(authentication)) {
            return null;
        }

        Long uid = extractUserId(authentication, userIdFromPrincipal);
        if (uid == null) {
            return List.of();
        }

        return scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());
    }

    @GetMapping
    public Page<EmployeeCertificationResponse> getPagedFiltered(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<Long> institutionIds,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateEnd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilEnd,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);

        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));

        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        return service.getPagedFiltered(
                employeeIds,
                certCodes,
                levels,
                subCodes,
                institutionIds,
                statuses,
                search,
                certDateStart,
                certDateEnd,
                validUntilStart,
                validUntilEnd,
                allowedCertIds,
                pageable);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<Long> institutionIds,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateEnd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilEnd,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);

        byte[] bytes = service.exportExcel(
                employeeIds,
                certCodes,
                levels,
                subCodes,
                institutionIds,
                statuses,
                search,
                certDateStart,
                certDateEnd,
                validUntilStart,
                validUntilEnd,
                allowedCertIds);

        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String filename = "employee-certifications-" + today + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename)
                        .build().toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/{id}")
    public EmployeeCertificationResponse getDetail(
            @PathVariable Long id,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        return service.getDetail(id, allowedCertIds);
    }

    @PostMapping
    public EmployeeCertificationResponse create(
            @RequestBody EmployeeCertificationRequest req,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        return service.create(req, allowedCertIds);
    }

    @PutMapping("/{id}")
    public EmployeeCertificationResponse update(
            @PathVariable Long id,
            @RequestBody EmployeeCertificationRequest req,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        return service.update(id, req, allowedCertIds);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(
            @PathVariable Long id,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        service.softDelete(id, allowedCertIds);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/upload")
    public EmployeeCertificationResponse uploadCertificate(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tidak boleh kosong");
        }

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        return service.uploadCertificate(id, file, allowedCertIds);
    }

    @PostMapping("/{id}/reupload")
    public EmployeeCertificationResponse reuploadCertificate(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tidak boleh kosong");
        }

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        return service.reuploadCertificate(id, file, allowedCertIds);
    }

    @DeleteMapping("/{id}/certificate")
    public ResponseEntity<Void> deleteCertificate(
            @PathVariable Long id,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        service.deleteCertificate(id, allowedCertIds);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> getCertificateFile(
            @PathVariable Long id,
            @RequestParam(value = "download", defaultValue = "false") boolean download,
            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        service.assertCanAccess(id, allowedCertIds);
        return fileStorageService.serveFile(id, download);
    }
}
