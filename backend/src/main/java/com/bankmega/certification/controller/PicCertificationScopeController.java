package com.bankmega.certification.controller;

import com.bankmega.certification.dto.PicCertificationScopeRequest;
import com.bankmega.certification.dto.PicCertificationScopeResponse;
import com.bankmega.certification.service.PicCertificationScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.util.List;

@RestController
@RequestMapping("/api/pic-scope")
@RequiredArgsConstructor
public class PicCertificationScopeController {

    private final PicCertificationScopeService svc;

    /* ============ helpers ============ */

    private boolean isSuperAdmin(Authentication auth) {
        return auth != null && auth.getAuthorities() != null &&
                auth.getAuthorities().stream().anyMatch(a -> {
                    String r = String.valueOf(a.getAuthority()).toUpperCase();
                    return "ROLE_SUPERADMIN".equals(r) || "SUPERADMIN".equals(r);
                });
    }

    private Long extractUserId(Authentication auth) {
        if (auth == null)
            return null;
        try {
            Object principal = auth.getPrincipal();
            Method m = principal.getClass().getMethod("getId");
            Object v = m.invoke(principal);
            return (v instanceof Number) ? ((Number) v).longValue() : null;
        } catch (Exception ignore) {
            return null;
        }
    }

    /* ============ endpoints ============ */

    /** List semua PIC + scope (khusus SUPERADMIN) */
    @GetMapping
    @PreAuthorize("hasRole('SUPERADMIN')")
    public List<PicCertificationScopeResponse> listAll() {
        return svc.getAll();
    }

    /** Ambil scope milik user yang login (SUPERADMIN/PIC) */
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('SUPERADMIN','PIC')")
    public PicCertificationScopeResponse getMine(Authentication auth) {
        Long selfId = extractUserId(auth);
        if (selfId == null)
            throw new AccessDeniedException("Cannot resolve user id from authentication");
        return svc.getByUser(selfId);
    }

    /** Ambil scope user tertentu (SUPERADMIN bebas, PIC hanya miliknya sendiri) */
    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','PIC')")
    public PicCertificationScopeResponse get(@PathVariable Long userId, Authentication auth) {
        if (isSuperAdmin(auth))
            return svc.getByUser(userId);
        Long selfId = extractUserId(auth);
        if (selfId == null || !selfId.equals(userId))
            throw new AccessDeniedException("Forbidden");
        return svc.getByUser(userId);
    }

    /** Update scope (khusus SUPERADMIN) */
    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public PicCertificationScopeResponse update(@PathVariable Long userId,
            @RequestBody PicCertificationScopeRequest req) {
        return svc.updateScope(userId, req);
    }
}
