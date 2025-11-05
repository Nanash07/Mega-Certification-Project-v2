package com.bankmega.certification.controller;

import com.bankmega.certification.dto.PicCertificationScopeRequest;
import com.bankmega.certification.dto.PicCertificationScopeResponse;
import com.bankmega.certification.service.PicCertificationScopeService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;

@RestController
@RequestMapping("/api/pic-scope")
@RequiredArgsConstructor
public class PicCertificationScopeController {

    private final PicCertificationScopeService svc;

    @GetMapping("/{userId}")
    @PreAuthorize("hasAnyRole('SUPERADMIN','PIC')")
    public PicCertificationScopeResponse get(@PathVariable Long userId, Authentication auth) {
        boolean isSuper = auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_SUPERADMIN".equalsIgnoreCase(a.getAuthority()));
        if (isSuper)
            return svc.getByUser(userId);

        // PIC hanya boleh lihat miliknya sendiri
        Long selfId = extractUserId(auth);
        if (selfId == null || !selfId.equals(userId)) {
            throw new org.springframework.security.access.AccessDeniedException("Forbidden");
        }
        return svc.getByUser(userId);
    }

    @PutMapping("/{userId}")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public PicCertificationScopeResponse update(@PathVariable Long userId,
            @RequestBody PicCertificationScopeRequest req) {
        return svc.updateScope(userId, req);
    }

    private Long extractUserId(Authentication auth) {
        try {
            Object principal = auth.getPrincipal();
            Method m = principal.getClass().getMethod("getId");
            Object v = m.invoke(principal);
            return (v instanceof Number) ? ((Number) v).longValue() : null;
        } catch (Exception ignore) {
            return null;
        }
    }
}
