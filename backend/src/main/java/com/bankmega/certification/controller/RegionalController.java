package com.bankmega.certification.controller;

import com.bankmega.certification.dto.RegionalRequest;
import com.bankmega.certification.dto.RegionalResponse;
import com.bankmega.certification.service.RegionalService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/regionals")
@RequiredArgsConstructor
public class RegionalController {

    private final RegionalService service;

    @GetMapping("/all")
    public ResponseEntity<List<RegionalResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping
    public ResponseEntity<Page<RegionalResponse>> search(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(service.search(q, page, size));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RegionalResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    public ResponseEntity<RegionalResponse> create(@RequestBody RegionalRequest req) {
        return ResponseEntity.ok(service.createOrGet(req));
    }

    @PutMapping("/{id}/toggle")
    public ResponseEntity<RegionalResponse> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggle(id));
    }
}
