package com.bankmega.certification.controller;

import com.bankmega.certification.dto.dashboard.*;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
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
    private final UserRepository userRepo;

    /* ================= helpers ================= */

    private DashboardFilters toFilters(Long regionalId, Long divisionId, Long unitId,
            Long certificationId, Long levelId, Long subFieldId, Integer year) {
        return DashboardFilters.builder()
                .regionalId(regionalId)
                .divisionId(divisionId)
                .unitId(unitId)
                .certificationId(certificationId)
                .levelId(levelId)
                .subFieldId(subFieldId)
                .year(year)
                .build();
    }

    /** true kalau authority mengandung ROLE_PIC / PIC (lebih toleran) */
    private boolean isPic(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> {
            String r = String.valueOf(a.getAuthority()).toUpperCase();
            return r.equals("PIC") || r.equals("ROLE_PIC") || r.contains("PIC");
        });
    }

    /**
     * ambil userId dari principal (mendukung CustomUserDetails#getId; fallback
     * username -> repo)
     */
    private Long extractUserId(Authentication auth, Long injectedUserId) {
        if (injectedUserId != null)
            return injectedUserId;
        if (auth == null)
            return null;

        Object principal = auth.getPrincipal();
        // coba panggil getId() via refleksi kalau ada
        try {
            Method m = principal.getClass().getMethod("getId");
            Object v = m.invoke(principal);
            if (v instanceof Number)
                return ((Number) v).longValue();
        } catch (Exception ignore) {
            /* fallthrough */ }

        // fallback: cari dari username
        try {
            String uname = auth.getName();
            if (uname != null && !"anonymousUser".equalsIgnoreCase(uname)) {
                return userRepo.findByUsername(uname).map(u -> u.getId()).orElse(null);
            }
        } catch (Exception ignore) {
            /* fallthrough */ }

        // fallback tidak ada: biarkan null
        return null;
    }

    /** inject daftar certificationId yang diizinkan untuk PIC */
    private DashboardFilters applyPicScope(DashboardFilters f, Authentication auth, Long userIdFromPrincipal) {
        if (!isPic(auth))
            return f;

        Long uid = extractUserId(auth, userIdFromPrincipal);
        if (uid == null) {
            // tidak bisa identifikasi user; amankan dengan scope kosong (akan jadi 1=0 di
            // repo)
            f.setAllowedCertificationIds(Collections.emptyList());
            return f;
        }

        List<Long> allowed = scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());

        f.setAllowedCertificationIds(allowed);

        // Kalau client sengaja set certificationId yang tidak termasuk scope →
        // kosongkan
        if (f.getCertificationId() != null && !allowed.contains(f.getCertificationId())) {
            f.setCertificationId(null);
        }
        return f;
    }

    /* ================= endpoints ================= */

    @GetMapping("/summary")
    public SummaryDTO summary(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId // optional, kalau principal punya getId()
    ) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId, certificationId, levelId, subFieldId, null);
        f = applyPicScope(f, auth, userId);
        return svc.getSummary(f);
    }

    @GetMapping("/monthly")
    public List<MonthlyPoint> monthly(
            @RequestParam Integer year,
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId, certificationId, levelId, subFieldId, year);
        f = applyPicScope(f, auth, userId);
        return svc.getMonthly(f);
    }

    @GetMapping("/ongoing-batches")
    public List<BatchCard> ongoingBatches(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId, certificationId, levelId, subFieldId, null);
        f = applyPicScope(f, auth, userId);
        return svc.getOngoingBatches(f);
    }

    @GetMapping("/priority")
    public Map<String, List<PriorityRow>> priority(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        DashboardFilters f = toFilters(regionalId, divisionId, unitId, certificationId, levelId, subFieldId, null);
        f = applyPicScope(f, auth, userId);
        return svc.getPriority(f);
    }

    @GetMapping("/filters")
    public FiltersResponse filters(
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        FiltersResponse res = svc.getFilters();

        // batasi daftar sertifikasi di response untuk PIC
        if (isPic(auth)) {
            Long uid = extractUserId(auth, userId);
            if (uid != null) {
                List<Long> allowed = scopeRepo.findByUser_Id(uid).stream()
                        .map(s -> s.getCertification().getId())
                        .toList();
                res.setCertifications(
                        res.getCertifications().stream()
                                .filter(c -> allowed.contains(c.getId()))
                                .toList());
            } else {
                res.setCertifications(Collections.emptyList());
            }
        }
        return res;
    }
}
