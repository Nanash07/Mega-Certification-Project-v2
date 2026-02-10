// src/main/java/com/bankmega/certification/controller/EmployeeController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeRequest;
import com.bankmega.certification.dto.EmployeeResponse;
import com.bankmega.certification.dto.dashboard.EmployeeCountResponse;
import com.bankmega.certification.service.EmployeeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService service;

    // Active - Paging + Filter
    @GetMapping("/paged")
    public ResponseEntity<Page<EmployeeResponse>> getPaged(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> regionalIds,
            @RequestParam(required = false) List<Long> divisionIds,
            @RequestParam(required = false) List<Long> unitIds,
            @RequestParam(required = false) List<Long> jobPositionIds,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String search,
            Pageable pageable) {

        return ResponseEntity.ok(
                service.search(employeeIds, regionalIds, divisionIds, unitIds, jobPositionIds, statuses, search,
                        pageable));
    }

    // Resigned - Paging + Filter
    @GetMapping("/resigned/paged")
    public ResponseEntity<Page<EmployeeResponse>> getResignedPaged(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<Long> regionalIds,
            @RequestParam(required = false) List<Long> divisionIds,
            @RequestParam(required = false) List<Long> unitIds,
            @RequestParam(required = false) List<Long> jobPositionIds,
            @RequestParam(required = false) String search,
            Pageable pageable) {

        return ResponseEntity.ok(
                service.searchResigned(employeeIds, regionalIds, divisionIds, unitIds, jobPositionIds, search,
                        pageable));
    }

    // ======= DASHBOARD COUNT (ACTIVE ONLY, exclude RESIGN) =======
    @GetMapping("/count")
    public ResponseEntity<EmployeeCountResponse> countActive(
            @RequestParam(required = false) Long regionalId,
            @RequestParam(required = false) Long divisionId,
            @RequestParam(required = false) Long unitId) {

        long count = service.countActive(regionalId, divisionId, unitId);
        return ResponseEntity.ok(new EmployeeCountResponse(count));
    }

    // All active (for dropdown)
    @GetMapping("/all")
    public ResponseEntity<List<EmployeeResponse>> getAllActive() {
        return ResponseEntity.ok(service.getAllActive());
    }

    // Detail (active + resigned)
    @GetMapping("/{id}")
    public ResponseEntity<EmployeeResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // Create
    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(service.create(req));
    }

    // Update
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> update(@PathVariable Long id, @RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    // Resign (status change only)
    @PatchMapping("/{id}/resign")
    public ResponseEntity<EmployeeResponse> resign(@PathVariable Long id) {
        return ResponseEntity.ok(service.resign(id));
    }

    // Soft delete (hapus dari sistem)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
