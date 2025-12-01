package com.bankmega.certification.controller;

import com.bankmega.certification.dto.dashboard.*;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService svc;
    private final PicCertificationScopeRepository scopeRepo;

    /* ================= helpers ================= */

    private DashboardFilters toFilters(Long regionalId, Long divisionId, Long unitId,
            Long certificationId, Long levelId, Long subFieldId,
            LocalDate startDate, LocalDate endDate, String batchType) {
        return DashboardFilters.builder()
                .regionalId(regionalId)
                .divisionId(divisionId)
                .unitId(unitId)
                .certificationId(certificationId)
                .levelId(levelId)
                .subFieldId(subFieldId)
                .startDate(startDate)
                .endDate(endDate)
                .batchType(batchType)
                .build();
    }

    /** helper khusus untuk pegawai */
    private DashboardFilters toEmployeeFilters(Long employeeId,
            LocalDate startDate,
            LocalDate endDate,
            String batchType) {
        return DashboardFilters.builder()
                .employeeId(employeeId)
                .startDate(startDate)
                .endDate(endDate)
                .batchType(batchType)
                .build();
    }

    /** true kalau authority mengandung ROLE_PIC / PIC */
    private boolean isPic(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return "PIC".equalsIgnoreCase(r) || "ROLE_PIC".equalsIgnoreCase(r);
        });
    }

    /** ambil userId dari principal (mendukung CustomUserDetails#getId) */
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
            /* fallthrough */
        }
        return null;
    }

    /**
     * ambil employeeId dari principal (mendukung CustomUserDetails#getEmployeeId)
     */
    private Long extractEmployeeId(Authentication auth, Long injectedEmployeeId) {
        if (injectedEmployeeId != null)
            return injectedEmployeeId;
        if (auth == null)
            return null;

        Object principal = auth.getPrincipal();
        try {
            Method m = principal.getClass().getMethod("getEmployeeId");
            Object v = m.invoke(principal);
            if (v instanceof Number)
                return ((Number) v).longValue();
        } catch (Exception ignore) {
            /* fallthrough */
        }
        return null;
    }

    /** inject daftar certificationId yang diizinkan untuk PIC */
    private DashboardFilters applyPicScope(DashboardFilters f, Authentication auth, Long userIdFromPrincipal) {
        if (!isPic(auth))
            return f;

        Long uid = extractUserId(auth, userIdFromPrincipal);
        if (uid == null) {
            // tidak bisa identifikasi user; amankan: hasil harus kosong
            f.setAllowedCertificationIds(List.of(-1L));
            f.setCertificationId(null);
            return f;
        }

        List<Long> allowed = scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());

        // kalau scope kosong → sentinel -1 supaya query menghasilkan nol baris
        if (allowed == null || allowed.isEmpty()) {
            f.setAllowedCertificationIds(List.of(-1L));
            f.setCertificationId(null);
            return f;
        }

        f.setAllowedCertificationIds(allowed);

        // Kalau client set certificationId yang tidak termasuk scope → kosongkan
        if (f.getCertificationId() != null && !allowed.contains(f.getCertificationId())) {
            f.setCertificationId(null);
        }
        return f;
    }

    /* ================= endpoints existing (Superadmin / PIC) ================= */

    @GetMapping("/summary")
    public SummaryDTO summary(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId,
                certificationId, levelId, subFieldId,
                null, null, null);
        f = applyPicScope(f, auth, userId);
        return svc.getSummary(f);
    }

    @GetMapping("/monthly")
    public List<MonthlyPoint> monthly(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String batchType,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId,
                certificationId, levelId, subFieldId,
                startDate, endDate, batchType);
        f = applyPicScope(f, auth, userId);
        return svc.getMonthly(f);
    }

    /* ================= endpoints khusus Pegawai ================= */

    @GetMapping("/employee/summary")
    public SummaryDTO employeeSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String batchType,
            Authentication auth,
            @AuthenticationPrincipal(expression = "employeeId") Long employeeIdFromPrincipal) {

        Long employeeId = extractEmployeeId(auth, employeeIdFromPrincipal);
        if (employeeId == null) {
            // amanin: kalau nggak ada mapping employee, balikin kosong
            return svc.getSummary(
                    DashboardFilters.builder()
                            .employeeId(-1L)
                            .build());
        }

        DashboardFilters f = toEmployeeFilters(employeeId, startDate, endDate, batchType);
        // NOTE: tidak pakai applyPicScope, karena ini mode pegawai (scope by
        // employeeId)
        return svc.getSummary(f);
    }

    @GetMapping("/employee/monthly")
    public List<MonthlyPoint> employeeMonthly(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String batchType,
            Authentication auth,
            @AuthenticationPrincipal(expression = "employeeId") Long employeeIdFromPrincipal) {

        Long employeeId = extractEmployeeId(auth, employeeIdFromPrincipal);
        if (employeeId == null) {
            return List.of();
        }

        DashboardFilters f = toEmployeeFilters(employeeId, startDate, endDate, batchType);
        return svc.getMonthly(f);
    }
}
