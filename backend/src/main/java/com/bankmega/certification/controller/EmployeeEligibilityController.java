package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.dto.dashboard.EligibilityCountResponse;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.service.EmployeeEligibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee-eligibility")
@RequiredArgsConstructor
public class EmployeeEligibilityController {

    private final EmployeeEligibilityService service;
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

        List<Long> ids = scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());

        return ids;
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<EmployeeEligibilityResponse>> getPagedFiltered(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> jobIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) List<String> sources,
            @RequestParam(required = false) String search,

            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,

            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal,
            Pageable pageable) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            return ResponseEntity.ok(Page.empty(pageable));
        }

        Page<EmployeeEligibilityResponse> result = service.getPagedFiltered(
                employeeIds,
                jobIds,
                certCodes,
                levels,
                subCodes,
                statuses,
                sources,
                search,
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                allowedCertIds,
                pageable);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> jobIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) List<String> sources,
            @RequestParam(required = false) String search,

            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,

            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            byte[] empty = service.exportExcel(
                    employeeIds, jobIds, certCodes, levels, subCodes, statuses, sources, search,
                    regionalId, divisionId, unitId, certificationId, levelId, subFieldId,
                    allowedCertIds);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                            .filename("eligibility-empty.xlsx")
                            .build().toString())
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(empty);
        }

        byte[] bytes = service.exportExcel(
                employeeIds, jobIds, certCodes, levels, subCodes, statuses, sources, search,
                regionalId, divisionId, unitId, certificationId, levelId, subFieldId,
                allowedCertIds);

        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String filename = "employee-eligibility-" + today + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename)
                        .build().toString())
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/count")
    public ResponseEntity<EligibilityCountResponse> getDashboardCount(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) List<String> statuses,

            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,

            @RequestParam(required = false) List<Long> employeeIds,

            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        List<Long> allowedCertIds = resolveAllowedCertIds(authentication, userIdFromPrincipal);
        if (allowedCertIds != null && allowedCertIds.isEmpty()) {
            return ResponseEntity.ok(new EligibilityCountResponse(0L));
        }

        List<String> effectiveStatuses;
        if (statuses != null && !statuses.isEmpty()) {
            effectiveStatuses = statuses;
        } else if (status != null && !status.isBlank()) {
            effectiveStatuses = List.of(status);
        } else {
            effectiveStatuses = null;
        }

        long count = service.countForDashboard(
                effectiveStatuses,
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                allowedCertIds,
                employeeIds);

        return ResponseEntity.ok(new EligibilityCountResponse(count));
    }

    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeEligibilityResponse>> getByEmployee(@PathVariable Long employeeId) {
        return ResponseEntity.ok(service.getByEmployeeId(employeeId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EmployeeEligibilityResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshAll() {
        int count = service.refreshEligibility();
        return ResponseEntity.ok(Map.of(
                "message", "Eligibility refreshed for all employees",
                "refreshedCount", count));
    }

    @PostMapping("/refresh/{employeeId}")
    public ResponseEntity<Map<String, Object>> refreshForEmployee(@PathVariable Long employeeId) {
        service.refreshEligibilityForEmployee(employeeId);
        return ResponseEntity.ok(Map.of(
                "message", "Eligibility refreshed for employee ID: " + employeeId));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<EmployeeEligibilityResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleActive(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> softDelete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("deletedId", id, "status", "success"));
    }
}
