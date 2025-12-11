// src/main/java/com/bankmega/certification/controller/EmployeeBatchController.java
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

    // ===================== READ =====================

    /** Get semua peserta dalam 1 batch (tanpa paging) */
    @GetMapping("/batch/{batchId}")
    public ResponseEntity<List<EmployeeBatchResponse>> getByBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(service.getByBatch(batchId));
    }

    /**
     * Get peserta batch dengan paging + filter organisasi + optional filter pegawai
     */
    @GetMapping("/batch/{batchId}/paged")
    public ResponseEntity<Page<EmployeeBatchResponse>> getPagedByBatch(
            @PathVariable Long batchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmployeeBatch.Status status,
            @RequestParam(required = false) String regional,
            @RequestParam(required = false) String division,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false, name = "job") String job,
            @RequestParam(required = false) Long employeeId, // 🔹 NEW: filter personal
            Pageable pageable) {

        return ResponseEntity.ok(
                service.search(batchId, search, status, regional, division, unit, job, employeeId, pageable));
    }

    /**
     * Search global peserta batch (bisa pakai batchId atau tidak) + optional filter
     * pegawai
     */
    @GetMapping
    public ResponseEntity<Page<EmployeeBatchResponse>> search(
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) EmployeeBatch.Status status,
            @RequestParam(required = false) String regional,
            @RequestParam(required = false) String division,
            @RequestParam(required = false) String unit,
            @RequestParam(required = false, name = "job") String job,
            @RequestParam(required = false) Long employeeId, // 🔹 NEW: filter personal
            Pageable pageable) {

        return ResponseEntity.ok(
                service.search(batchId, search, status, regional, division, unit, job, employeeId, pageable));
    }

    /** Daftar pegawai yang eligible untuk batch (exclude yg sudah jadi peserta) */
    @GetMapping("/batch/{batchId}/eligible")
    public ResponseEntity<List<EmployeeEligibilityResponse>> getEligibleForBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(service.getEligibleEmployeesForBatch(batchId));
    }

    // ===================== WRITE (Participants) =====================

    /** Tambah 1 peserta (auto-restore jika sebelumnya soft-deleted) */
    @PostMapping("/batch/{batchId}/employee/{employeeId}")
    public ResponseEntity<EmployeeBatchResponse> addParticipant(
            @PathVariable Long batchId,
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(service.addParticipant(batchId, employeeId));
    }

    /** Tambah peserta bulk (gaya baru) */
    @PostMapping("/batch/{batchId}/employees")
    public ResponseEntity<List<EmployeeBatchResponse>> addParticipants(
            @PathVariable Long batchId,
            @RequestBody List<Long> employeeIds) {
        return ResponseEntity.ok(service.addParticipantsBulk(batchId, employeeIds));
    }

    /** Tambah peserta bulk (legacy path, dipertahankan utk kompatibilitas) */
    @PostMapping("/batch/{batchId}/employees/bulk")
    public ResponseEntity<List<EmployeeBatchResponse>> addParticipantsBulk(
            @PathVariable Long batchId,
            @RequestBody List<Long> employeeIds) {
        return ResponseEntity.ok(service.addParticipantsBulk(batchId, employeeIds));
    }

    // ===================== WRITE (Status Transitions) =====================

    /**
     * Update status peserta via query params:
     * status=REGISTERED|ATTENDED|PASSED|FAILED, score(optional), notes(optional)
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<EmployeeBatchResponse> updateStatus(
            @PathVariable Long id,
            @RequestParam EmployeeBatch.Status status,
            @RequestParam(required = false) Integer score,
            @RequestParam(required = false) String notes) {

        return ResponseEntity.ok(service.updateStatus(id, status, score, notes));
    }

    /** Shortcut: REGISTERED -> ATTENDED */
    @PatchMapping("/{id}/attend")
    public ResponseEntity<EmployeeBatchResponse> attend(
            @PathVariable Long id,
            @RequestParam(required = false) Integer score,
            @RequestParam(required = false) String notes) {

        return ResponseEntity.ok(service.updateStatus(id, EmployeeBatch.Status.ATTENDED, score, notes));
    }

    /** Shortcut: ATTENDED -> PASSED */
    @PatchMapping("/{id}/pass")
    public ResponseEntity<EmployeeBatchResponse> pass(
            @PathVariable Long id,
            @RequestParam(required = false) Integer score,
            @RequestParam(required = false) String notes) {

        return ResponseEntity.ok(service.updateStatus(id, EmployeeBatch.Status.PASSED, score, notes));
    }

    /** Shortcut: ATTENDED -> FAILED */
    @PatchMapping("/{id}/fail")
    public ResponseEntity<EmployeeBatchResponse> fail(
            @PathVariable Long id,
            @RequestParam(required = false) Integer score,
            @RequestParam(required = false) String notes) {

        return ResponseEntity.ok(service.updateStatus(id, EmployeeBatch.Status.FAILED, score, notes));
    }

    /** Retry: FAILED -> REGISTERED (reset attended/result/score) */
    @PatchMapping("/{id}/retry")
    public ResponseEntity<EmployeeBatchResponse> retryFailed(@PathVariable Long id) {
        return ResponseEntity.ok(service.retryFailed(id));
    }

    /** Soft delete peserta (hanya saat REGISTERED) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeParticipant(@PathVariable Long id) {
        service.removeParticipant(id);
        return ResponseEntity.noContent().build();
    }
}
