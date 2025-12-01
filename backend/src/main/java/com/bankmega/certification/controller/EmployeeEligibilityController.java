// src/main/java/com/bankmega/certification/controller/EmployeeEligibilityController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.dto.EligibilityKpiResponse;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.service.EmployeeEligibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employee-eligibility")
@RequiredArgsConstructor
public class EmployeeEligibilityController {

    private final EmployeeEligibilityService service;
    private final PicCertificationScopeRepository scopeRepo;

    // ===== helpers auth/PIC =====

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

    // ===================== PAGED FILTERED =====================
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

            // filter "dashboard"
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,

            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal,
            Pageable pageable) {

        // ===== PIC scope handling =====
        List<Long> allowedCertIds = null;

        if (isPic(authentication)) {
            Long uid = extractUserId(authentication, userIdFromPrincipal);
            if (uid == null) {
                // tidak bisa identifikasi user PIC -> aman: 0 data
                Page<EmployeeEligibilityResponse> empty = Page.empty(pageable);
                return ResponseEntity.ok(empty);
            }

            allowedCertIds = scopeRepo.findByUser_Id(uid).stream()
                    .map(PicCertificationScope::getCertification)
                    .map(c -> c.getId())
                    .collect(Collectors.toList());

            if (allowedCertIds.isEmpty()) {
                // PIC tanpa scope -> 0 data
                Page<EmployeeEligibilityResponse> empty = Page.empty(pageable);
                return ResponseEntity.ok(empty);
            }
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

    // ===================== DASHBOARD KPI (PIE CHART DARI ELIGIBILITY)
    // =====================
    @GetMapping("/dashboard-kpi")
    public ResponseEntity<EligibilityKpiResponse> getDashboardKpi(
            // filter "dashboard"
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,

            Authentication authentication,
            @AuthenticationPrincipal(expression = "id") Long userIdFromPrincipal) {

        // ===== PIC scope handling (sama seperti /paged) =====
        List<Long> allowedCertIds = null;

        if (isPic(authentication)) {
            Long uid = extractUserId(authentication, userIdFromPrincipal);
            if (uid == null) {
                // tidak bisa identifikasi user PIC -> aman: 0 data
                return ResponseEntity.ok(new EligibilityKpiResponse(0L, 0L, 0L, 0L, 0L));
            }

            allowedCertIds = scopeRepo.findByUser_Id(uid).stream()
                    .map(PicCertificationScope::getCertification)
                    .map(c -> c.getId())
                    .collect(Collectors.toList());

            if (allowedCertIds.isEmpty()) {
                // PIC tanpa scope -> 0 data
                return ResponseEntity.ok(new EligibilityKpiResponse(0L, 0L, 0L, 0L, 0L));
            }
        }

        EligibilityKpiResponse kpi = service.getDashboardKpi(
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                allowedCertIds);

        return ResponseEntity.ok(kpi);
    }

    // ===================== GET BY EMPLOYEE (DETAIL PAGE) =====================
    @GetMapping("/employee/{employeeId}")
    public ResponseEntity<List<EmployeeEligibilityResponse>> getByEmployee(@PathVariable Long employeeId) {
        List<EmployeeEligibilityResponse> data = service.getByEmployeeId(employeeId);
        return ResponseEntity.ok(data);
    }

    // ===================== GET BY ID =====================
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeEligibilityResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // ===================== REFRESH MASS (SEMUA PEGAWAI) =====================
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshAll() {
        int count = service.refreshEligibility();
        return ResponseEntity.ok(Map.of(
                "message", "Eligibility refreshed for all employees",
                "refreshedCount", count));
    }

    // ===================== REFRESH PER EMPLOYEE =====================
    @PostMapping("/refresh/{employeeId}")
    public ResponseEntity<Map<String, Object>> refreshForEmployee(@PathVariable Long employeeId) {
        service.refreshEligibilityForEmployee(employeeId);
        return ResponseEntity.ok(Map.of(
                "message", "Eligibility refreshed for employee ID: " + employeeId));
    }

    // ===================== TOGGLE ACTIVE =====================
    @PutMapping("/{id}/toggle")
    public ResponseEntity<EmployeeEligibilityResponse> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleActive(id));
    }

    // ===================== SOFT DELETE =====================
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> softDelete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.ok(Map.of("deletedId", id, "status", "success"));
    }
}
