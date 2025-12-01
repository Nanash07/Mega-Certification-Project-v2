package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeRequest;
import com.bankmega.certification.dto.EmployeeResponse;
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
            @RequestParam(required = false) String search,
            Pageable pageable) {

        return ResponseEntity.ok(
                service.search(employeeIds, regionalIds, divisionIds, unitIds, jobPositionIds, search, pageable));
    }

    // Resigned - Paging + Filter (same shape as active)
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

    // Update (active only)
    @PutMapping("/{id}")
    public ResponseEntity<EmployeeResponse> update(@PathVariable Long id, @RequestBody EmployeeRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    // Soft delete (to resigned)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }
}
