package com.bankmega.certification.controller;

import com.bankmega.certification.dto.RoleRequest;
import com.bankmega.certification.dto.RoleResponse;
import com.bankmega.certification.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService service;

    // 🔹 Ambil semua role (buat dropdown atau list tanpa pagination)
    @GetMapping
    public ResponseEntity<List<RoleResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    // 🔹 Ambil role dengan pagination + search (parameter opsional)
    @GetMapping("/page")
    public ResponseEntity<Page<RoleResponse>> getPage(
            @RequestParam(required = false) String q,
            Pageable pageable) {
        return ResponseEntity.ok(service.getPage(q, pageable));
    }

    // 🔹 Ambil 1 role by ID
    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // 🔹 Tambah role baru
    @PostMapping
    public ResponseEntity<RoleResponse> create(@RequestBody RoleRequest req) {
        RoleResponse created = service.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // 🔹 Update role
    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(
            @PathVariable Long id,
            @RequestBody RoleRequest req) {
        return ResponseEntity.ok(service.update(id, req));
    }

    // 🔹 Hapus role (cek dulu apakah sedang digunakan)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
