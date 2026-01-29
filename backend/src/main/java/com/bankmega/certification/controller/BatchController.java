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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
        if (principal == null)
            return null;

        try {
            Method m = principal.getClass().getMethod("getId");
            Object v = m.invoke(principal);
            if (v instanceof Number n)
                return n.longValue();
        } catch (Exception ignore) {
        }

        return null;
    }

    private List<Long> resolveAllowedCertIds(Authentication auth, Long userIdFromPrincipal) {
        if (!isPic(auth))
            return null;

        Long uid = extractUserId(auth, userIdFromPrincipal);
        if (uid == null)
            return List.of(-1L);

        List<Long> ids = scopeRepo.findByUser_Id(uid).stream()
                .map(PicCertificationScope::getCertification)
                .map(c -> c.getId())
                .collect(Collectors.toList());

        return ids.isEmpty() ? List.of(-1L) : ids;
    }

    @PostMapping
    public ResponseEntity<BatchResponse> create(
            @RequestBody BatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(batchService.create(request, username));
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<BatchResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Batch.Status status,
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
                null,
                pageable);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/export-excel")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Batch.Status status,
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

        byte[] bytes = batchService.exportExcel(
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
                null);

        String filename = "batches.xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/dashboard-count")
    public ResponseEntity<BatchCountResponse> dashboardCount(
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

        List<Batch.Status> effectiveStatuses = (statuses != null && !statuses.isEmpty()) ? statuses
                : (status != null ? List.of(status) : null);

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
                null);

        return ResponseEntity.ok(new BatchCountResponse(count));
    }

    @GetMapping("/monthly")
    public ResponseEntity<List<MonthlyPoint>> monthly(
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
            @AuthenticationPrincipal(expression = "id") Long userId,
            @AuthenticationPrincipal(expression = "employeeId") Long employeeId) {

        List<Long> allowedCertIds = resolveAllowedCertIds(auth, userId);

        List<MonthlyPoint> points = batchService.monthlyBatchCount(
                regionalId,
                divisionId,
                unitId,
                certificationId,
                levelId,
                subFieldId,
                startDate,
                endDate,
                type,
                allowedCertIds,
                employeeId);

        return ResponseEntity.ok(points);
    }

    @GetMapping("/employee/ongoing-paged")
    public ResponseEntity<Page<BatchResponse>> employeeOngoing(
            @AuthenticationPrincipal(expression = "employeeId") Long employeeId,
            Pageable pageable) {

        if (employeeId == null) {
            return ResponseEntity.ok(Page.empty(java.util.Objects.requireNonNull(pageable)));
        }

        Page<BatchResponse> result = batchService.search(
                null,
                Batch.Status.ONGOING,
                null,
                null,
                null,
                null, null, null,
                null, null, null,
                null, null,
                null,
                employeeId,
                pageable);

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/export-participants")
    public ResponseEntity<byte[]> exportParticipants(@PathVariable Long id) {
        byte[] bytes = batchService.exportParticipants(id);
        String filename = "Batch_Participants_Export.xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(
                        MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/{id}")
    public ResponseEntity<BatchResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(batchService.getByIdResponse(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BatchResponse> update(
            @PathVariable Long id,
            @RequestBody BatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(batchService.update(id, request, username));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable Long id,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        batchService.delete(id, username);
        return ResponseEntity.noContent().build();
    }
}
