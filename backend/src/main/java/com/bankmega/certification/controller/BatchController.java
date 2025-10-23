package com.bankmega.certification.controller;

import com.bankmega.certification.dto.BatchRequest;
import com.bankmega.certification.dto.BatchResponse;
import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.service.BatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/batches")
@RequiredArgsConstructor
public class BatchController {

    private final BatchService batchService;

    // 🔹 Create
    @PostMapping
    public ResponseEntity<BatchResponse> create(
            @RequestBody BatchRequest request,
            Authentication authentication) {
        String username = authentication != null ? authentication.getName() : "system";
        return ResponseEntity.ok(batchService.create(request, username));
    }

    // 🔹 Search + Filter + Paging
    @GetMapping("/paged")
    public ResponseEntity<Page<BatchResponse>> search(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Batch.Status status,
            @RequestParam(required = false) Batch.BatchType type,
            @RequestParam(required = false) Long certificationRuleId,
            @RequestParam(required = false) Long institutionId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            Pageable pageable) {
        Page<BatchResponse> result = batchService.search(
                search, status, type, certificationRuleId, institutionId, startDate, endDate, pageable);
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
