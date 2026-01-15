package com.bankmega.certification.service;

import com.bankmega.certification.dto.UnitRequest;
import com.bankmega.certification.dto.UnitResponse;
import com.bankmega.certification.entity.Unit;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.UnitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository repo;
    private final EmployeeRepository employeeRepo;

    public List<UnitResponse> getAll() {
        return repo.findAllByOrderByIsActiveDescNameAsc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Page<UnitResponse> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("isActive").descending().and(Sort.by("name").ascending()));

        Page<Unit> result = (q == null || q.isBlank())
                ? repo.findAll(pageable)
                : repo.findByNameContainingIgnoreCase(q, pageable);

        return result.map(this::mapToResponse);
    }

    public UnitResponse getById(Long id) {
        Unit u = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Unit not found: " + id));
        return mapToResponse(u);
    }

    @Transactional
    public UnitResponse createOrGet(UnitRequest req) {
        Unit u = repo.findByNameIgnoreCase(req.getName())
                .orElseGet(() -> repo.save(Objects.requireNonNull(Unit.builder()
                        .name(req.getName())
                        .isActive(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build())));
        return mapToResponse(u);
    }

    @Transactional
    public UnitResponse toggle(Long id) {
        Unit u = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Unit not found: " + id));

        if (Boolean.TRUE.equals(u.getIsActive())) {
            boolean dipakai = employeeRepo.existsByUnit(u);
            if (dipakai) {
                throw new ConflictException("Unit masih dipakai oleh pegawai, tidak bisa dinonaktifkan");
            }
        }

        u.setIsActive(!u.getIsActive());
        u.setUpdatedAt(Instant.now());
        return mapToResponse(repo.save(u));
    }

    private UnitResponse mapToResponse(Unit u) {
        return UnitResponse.builder()
                .id(u.getId())
                .name(u.getName())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}