package com.bankmega.certification.service;

import com.bankmega.certification.dto.JobPositionRequest;
import com.bankmega.certification.dto.JobPositionResponse;
import com.bankmega.certification.entity.JobPosition;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.JobPositionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class JobPositionService {

    private final JobPositionRepository repo;
    private final EmployeeRepository employeeRepo;

    public List<JobPositionResponse> getAll() {
        return repo.findAllByOrderByIsActiveDescNameAsc().stream()
                .map(this::mapToResponse)
                .toList();
    }

    public Page<JobPositionResponse> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("isActive").descending().and(Sort.by("name").ascending()));

        Page<JobPosition> result;
        if (q == null || q.isBlank()) {
            result = repo.findAll(pageable);
        } else {
            result = repo.findByNameContainingIgnoreCase(q, pageable);
        }

        return result.map(this::mapToResponse);
    }

    public JobPositionResponse getById(Long id) {
        JobPosition jp = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Job Position not found: " + id));
        return mapToResponse(jp);
    }

    @Transactional
    public JobPositionResponse createOrGet(JobPositionRequest req) {
        JobPosition jp = repo.findByNameIgnoreCase(req.getName())
                .orElseGet(() -> repo.save(Objects.requireNonNull(JobPosition.builder()
                        .name(req.getName())
                        .isActive(true)
                        .createdAt(Instant.now())
                        .updatedAt(Instant.now())
                        .build())));
        return mapToResponse(jp);
    }

    @Transactional
    public JobPositionResponse toggle(Long id) {
        JobPosition jp = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Job Position not found: " + id));

        if (Boolean.TRUE.equals(jp.getIsActive())) {
            boolean dipakai = employeeRepo.existsByJobPosition(jp);
            if (dipakai) {
                throw new ConflictException("Job Position masih dipakai oleh pegawai, tidak bisa dinonaktifkan");
            }
        }

        jp.setIsActive(!jp.getIsActive());
        jp.setUpdatedAt(Instant.now());
        return mapToResponse(repo.save(jp));
    }

    private JobPositionResponse mapToResponse(JobPosition jp) {
        return JobPositionResponse.builder()
                .id(jp.getId())
                .name(jp.getName())
                .isActive(jp.getIsActive())
                .createdAt(jp.getCreatedAt())
                .updatedAt(jp.getUpdatedAt())
                .build();
    }
}