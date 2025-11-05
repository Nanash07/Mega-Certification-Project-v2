package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeBatchResponse;
import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.service.EmployeeBatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-batches")
@RequiredArgsConstructor
public class EmployeeBatchController {

    private final EmployeeBatchService service;

    // Get semua peserta batch (tanpa paging)
    @GetMapping("/batch/{batchId}")
    public ResponseEntity<List<EmployeeBatchResponse>> getByBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(service.getByBatch(batchId));
    }

    // Get peserta batch dengan paging
    @GetMapping("/batch/{batchId}/paged")
    public ResponseEntity<Page<EmployeeBatchResponse>> getPagedByBatch(
            @PathVariable Long batchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmployeeBatch.Status status,
            @RequestParam(required = false) String regional, // ✅ NEW
            @RequestParam(required = false) String division, // ✅ NEW
            @RequestParam(required = false) String unit, // ✅ NEW
            @RequestParam(required = false, name = "job") String job, // ✅ NEW
            Pageable pageable) {
        return ResponseEntity.ok(
                service.search(batchId, search, status, regional, division, unit, job, pageable));
    }

    // Search global (optional)
    @GetMapping
    public ResponseEntity<Page<EmployeeBatchResponse>> search(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmployeeBatch.Status status,
            @RequestParam(required = false) String regional, // ✅ NEW
            @RequestParam(required = false) String division, // ✅ NEW
            @RequestParam(required = false) String unit, // ✅ NEW
            @RequestParam(required = false, name = "job") String job, // ✅ NEW
            Pageable pageable) {
        return ResponseEntity.ok(
                service.search(batchId, search, status, regional, division, unit, job, pageable));
    }

    // Tambah peserta single (auto-restore jika soft-deleted)
    @PostMapping("/batch/{batchId}/employee/{employeeId}")
    public ResponseEntity<EmployeeBatchResponse> addParticipant(
            @PathVariable Long batchId,
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(service.addParticipant(batchId, employeeId));
    }

    // Tambah peserta bulk (auto-restore jika soft-deleted)
    @PostMapping("/batch/{batchId}/employees/bulk")
    public ResponseEntity<List<EmployeeBatchResponse>> addParticipantsBulk(
            @PathVariable Long batchId,
            @RequestBody List<Long> employeeIds) {
        return ResponseEntity.ok(service.addParticipantsBulk(batchId, employeeIds));
    }

    // Update status peserta (REGISTERED -> ATTENDED -> PASSED/FAILED)
    @PutMapping("/{id}/status")
    public ResponseEntity<EmployeeBatchResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam EmployeeBatch.Status status,
            @RequestParam(required = false) Integer score,
            @RequestParam(required = false) String notes) {
        return ResponseEntity.ok(service.updateStatus(id, status, score, notes));
    }

    // Retry peserta FAILED -> REGISTERED
    @PatchMapping("/{id}/retry")
    public ResponseEntity<EmployeeBatchResponse> retryFailed(@PathVariable Long id) {
        return ResponseEntity.ok(service.retryFailed(id));
    }

    // Soft delete peserta (hanya boleh REGISTERED)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeParticipant(@PathVariable Long id) {
        service.removeParticipant(id);
        return ResponseEntity.noContent().build();
    }

    // Eligible employees untuk batch
    @GetMapping("/batch/{batchId}/eligible")
    public ResponseEntity<List<EmployeeEligibilityResponse>> getEligibleForBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(service.getEligibleEmployeesForBatch(batchId));
    }
}
