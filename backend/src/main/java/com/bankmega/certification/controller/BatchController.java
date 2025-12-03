// src/main/java/com/bankmega/certification/controller/BatchController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.BatchRequest;
import com.bankmega.certification.dto.BatchResponse;
import com.bankmega.certification.dto.dashboard.BatchCountResponse;
import com.bankmega.certification.dto.dashboard.MonthlyPoint;
import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.service.BatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;
    private final PicCertificationScopeRepository scopeRepo;

    // ==== helpers PIC / principal ====

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

    private List<Long> resolveAllowedCertIds(Authentication auth, Long userIdFromPrincipal) {
        if (!isPic(auth))
            return null; // non-PIC: tidak dibatasi scope sertifikasi

        Long uid = extractUserId(auth, userIdFromPrincipal);
        if (uid == null)
            return List.of(-1L); // sentinel kosong

        List<Long> ids = scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());

        // 🔐 PIC tanpa scope apapun -> pakai sentinel supaya hasil selalu kosong
        if (ids.isEmpty()) {
            return List.of(-1L);
        }
        return ids;
    }

    // 🔹 Create
    @PostMapping
    public ResponseEntity<BatchResponse> create(
            @RequestBody BatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(batchService.create(request, username));
    }

    // 🔹 Search + Filter + Paging (Superadmin + PIC + Dashboard)
    @GetMapping("/paged")
    public ResponseEntity<Page<BatchResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Batch.Status status,
            @RequestParam(required = false) Batch.BatchType type,
            @RequestParam(required = false) Long certificationRuleId,
            @RequestParam(required = false) Long institutionId,
            // filter dashboard tambahan:
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {

        List<Long> allowedCertIds = resolveAllowedCertIds(auth, userId);

        Page<BatchResponse> result = batchService.search(
                search,
                status,
                type,
                certificationRuleId,
                institutionId,
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                startDate,
                endDate,
                allowedCertIds,
                null, // employeeId (khusus endpoint employee)
                pageable);

        return ResponseEntity.ok(result);
    }

    // 🔹 Summary count untuk dashboard (Superadmin / PIC)
    @GetMapping("/dashboard-count")
    public BatchCountResponse dashboardCount(
            // bisa kirim 1 status atau banyak
            @RequestParam(required = false) Batch.Status status,
            @RequestParam(required = false) List<Batch.Status> statuses,
            @RequestParam(required = false) Batch.BatchType type,
            @RequestParam(required = false) Long certificationRuleId,
            @RequestParam(required = false) Long institutionId,
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId,
            @RequestParam(required = false) Long certificationId,
            @RequestParam(required = false) Long levelId,
            @RequestParam(required = false) Long subFieldId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {
        List<Long> allowedCertIds = resolveAllowedCertIds(auth, userId);

        // Normalisasi: kalau FE kirim 'statuses' pakai itu, kalau nggak fallback ke
        // 'status'
        List<Batch.Status> effectiveStatuses;
        if (statuses != null && !statuses.isEmpty()) {
            effectiveStatuses = statuses;
        } else if (status != null) {
            effectiveStatuses = List.of(status);
        } else {
            effectiveStatuses = null; // null -> semua status
        }

        long count = batchService.countForDashboard(
                effectiveStatuses,
                type,
                certificationRuleId,
                institutionId,
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                startDate,
                endDate,
                allowedCertIds,
                null // employeeId (khusus self endpoint)
        );

        return new BatchCountResponse(count);
    }

    // 🔹 Monthly batch chart untuk dashboard (Superadmin / PIC)
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
            @RequestParam(required = false) Batch.BatchType type,
            Authentication auth,
            @AuthenticationPrincipal(expression = "id") Long userId) {

        List<Long> allowedCertIds = resolveAllowedCertIds(auth, userId);

        return batchService.monthlyBatchCount(
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                startDate,
                endDate,
                type,
                allowedCertIds);
    }

    // 🔹 Batch berjalan khusus Pegawai (self)
    @GetMapping("/employee/ongoing-paged")
    public ResponseEntity<Page<BatchResponse>> employeeOngoing(
            @AuthenticationPrincipal(expression = "employeeId") Long employeeId,
            Pageable pageable) {

        if (employeeId == null) {
            return ResponseEntity.ok(Page.empty(pageable));
        }

        Page<BatchResponse> result = batchService.search(
                null, // search
                Batch.Status.ONGOING, // status
                null, // type
                null, // certificationRuleId
                null, // institutionId
                null, null, null, // regional/division/unit (scope employee sudah via join)
                null, null, null, // cert/level/subfield
                null, null, // startDate/endDate
                null, // allowedCertIds (PIC nggak relevan di sini)
                employeeId, // employeeId
                pageable);

        return ResponseEntity.ok(result);
    }

    // 🔹 Get by ID
    @GetMapping("/{id}")
    public ResponseEntity<BatchResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.getByIdResponse(id));
    }

    // 🔹 Update
    @PutMapping("/{id}")
    public ResponseEntity<BatchResponse> update(
            @PathVariable Long id,
            @RequestBody BatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(batchService.update(id, request, username));
    }

    // 🔹 Delete (soft delete)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        batchService.delete(id, username);
        return ResponseEntity.noContent().build();
    }
}
