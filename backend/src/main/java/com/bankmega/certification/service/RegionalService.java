package com.bankmega.certification.service;

import com.bankmega.certification.dto.RegionalRequest;
import com.bankmega.certification.dto.RegionalResponse;
import com.bankmega.certification.entity.Regional;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.RegionalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RegionalService {

    private final RegionalRepository repo;
    private final EmployeeRepository employeeRepo;

    // Ambil semua (dropdown)
    public List<RegionalResponse> getAll() {
        return repo.findAllByOrderByIsActiveDescNameAsc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    // Search + Pagination
    public Page<RegionalResponse> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("isActive").descending().and(Sort.by("name").ascending()));

        Page<Regional> result;
        if (q == null || q.isBlank()) {
            result = repo.findAll(pageable);
        } else {
            result = repo.findByNameContainingIgnoreCase(q, pageable);
        }

        return result.map(this::mapToResponse);
    }

    // Get by ID
    public RegionalResponse getById(Long id) {
        Regional r = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Regional not found: " + id));
        return mapToResponse(r);
    }

    // Create baru atau ambil existing
    @Transactional
    public RegionalResponse createOrGet(RegionalRequest req) {
        Regional r = repo.findByNameIgnoreCase(req.getName())
                .orElseGet(() -> repo.save(Regional.builder()
                        .name(req.getName())
                        .isActive(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build()));
        return mapToResponse(r);
    }

    // Toggle aktif/nonaktif
    @Transactional
    public RegionalResponse toggle(Long id) {
        Regional r = repo.findById(id)
                .orElseThrow(() -> new NotFoundException("Regional not found: " + id));

        if (Boolean.TRUE.equals(r.getIsActive())) {
            boolean dipakai = employeeRepo.existsByRegional(r);
            if (dipakai) {
                throw new ConflictException("Regional masih dipakai oleh pegawai, tidak bisa dinonaktifkan");
            }
        }

        r.setIsActive(!r.getIsActive());
        r.setUpdatedAt(Instant.now());
        return mapToResponse(repo.save(r));
    }

    private RegionalResponse mapToResponse(Regional r) {
        return RegionalResponse.builder()
                .id(r.getId())
                .name(r.getName())
                .isActive(r.getIsActive())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}