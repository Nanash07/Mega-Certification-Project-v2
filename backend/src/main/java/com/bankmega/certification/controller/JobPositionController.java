package com.bankmega.certification.controller;

import com.bankmega.certification.dto.JobPositionRequest;
import com.bankmega.certification.dto.JobPositionResponse;
import com.bankmega.certification.service.JobPositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/job-positions")
@RequiredArgsConstructor
public class JobPositionController {

    private final JobPositionService service;

    @GetMapping("/all")
    public ResponseEntity<List<JobPositionResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping
    public ResponseEntity<Page<JobPositionResponse>> search(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String q) {
        return ResponseEntity.ok(service.search(q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JobPositionResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<JobPositionResponse> create(@RequestBody JobPositionRequest req) {
        return ResponseEntity.ok(service.createOrGet(req));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<JobPositionResponse> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggle(id));
    }
}