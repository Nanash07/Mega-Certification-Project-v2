package com.bankmega.certification.controller;

import com.bankmega.certification.dto.UserRequest;
import com.bankmega.certification.dto.UserResponse;
import com.bankmega.certification.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    // ==== helper: cek apakah current user adalah PIC ====
    private boolean isPic(Authentication auth) {
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> {
            String r = a.getAuthority();
            return "PIC".equalsIgnoreCase(r) || "ROLE_PIC".equalsIgnoreCase(r);
        });
    }

    // ===================== GET PAGE (with filter & search) =====================
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getAll(
            @RequestParam(required = false) Long roleId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String q,
            @PageableDefault(size = 10) Pageable pageable,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);

        Page<UserResponse> result = service.getPage(roleId, isActive, q, pageable, callerIsPic);
        return ResponseEntity.ok(result);
    }

    // ===================== GET ACTIVE USERS (for dropdown / async select)
    // =====================
    @GetMapping("/active")
    public ResponseEntity<List<UserResponse>> getActiveUsers(
            @RequestParam(required = false) String q,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);
        List<UserResponse> result = service.searchActiveUsers(q, callerIsPic);
        return ResponseEntity.ok(result);
    }

    // ===================== GET ONE =====================
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getById(@PathVariable Long id, Authentication auth) {
        boolean callerIsPic = isPic(auth);
        return ResponseEntity.ok(service.getById(id, callerIsPic));
    }

    // ===================== CREATE =====================
    @PostMapping
    public ResponseEntity<UserResponse> create(
            @Valid @RequestBody UserRequest req,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);
        UserResponse created = service.create(req, callerIsPic);
        return ResponseEntity
                .created(URI.create("/api/users/" + created.getId()))
                .body(created);
    }

    // ===================== UPDATE =====================
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UserRequest req,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);
        return ResponseEntity.ok(service.update(id, req, callerIsPic));
    }

    // ===================== TOGGLE STATUS (aktif / nonaktif) =====================
    @PutMapping("/{id}/toggle")
    public ResponseEntity<UserResponse> toggle(
            @PathVariable Long id,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);
        return ResponseEntity.ok(service.toggleStatus(id, callerIsPic));
    }

    // ===================== DELETE (Soft Delete) =====================
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(
            @PathVariable Long id,
            Authentication auth) {

        boolean callerIsPic = isPic(auth);
        service.softDelete(id, callerIsPic);
        return ResponseEntity.ok(Map.of(
                "message", "User berhasil dihapus",
                "timestamp", System.currentTimeMillis()));
    }
}
