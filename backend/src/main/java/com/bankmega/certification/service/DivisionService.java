package com.bankmega.certification.service;

import com.bankmega.certification.dto.DivisionRequest;
import com.bankmega.certification.dto.DivisionResponse;
import com.bankmega.certification.entity.Division;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.DivisionRepository;
import com.bankmega.certification.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DivisionService {

    private final DivisionRepository repo;
    private final EmployeeRepository employeeRepo;

    public List<DivisionResponse> getAll() {
        return repo.findAllByOrderByIsActiveDescNameAsc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Page<DivisionResponse> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("isActive").descending().and(Sort.by("name").ascending()));

        Page<Division> result = (q == null || q.isBlank())
                ? repo.findAll(pageable)
                : repo.findByNameContainingIgnoreCase(q, pageable);

        return result.map(this::mapToResponse);
    }

    public DivisionResponse getById(Long id) {
        Division d = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Division not found: " + id));
        return mapToResponse(d);
    }

    @Transactional
    public DivisionResponse createOrGet(DivisionRequest req) {
        Division d = repo.findByNameIgnoreCase(req.getName())
                .orElseGet(() -> repo.save(Objects.requireNonNull(Division.builder()
                        .name(req.getName())
                        .isActive(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build())));
        return mapToResponse(d);
    }

    @Transactional
    public DivisionResponse toggle(Long id) {
        Division d = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Division not found: " + id));

        if (Boolean.TRUE.equals(d.getIsActive())) {
            boolean dipakai = employeeRepo.existsByDivision(d);
            if (dipakai) {
                throw new ConflictException("Division masih dipakai oleh pegawai, tidak bisa dinonaktifkan");
            }
        }

        d.setIsActive(!d.getIsActive());
        d.setUpdatedAt(Instant.now());
        return mapToResponse(repo.save(d));
    }

    private DivisionResponse mapToResponse(Division d) {
        return DivisionResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .isActive(d.getIsActive())
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}