package com.bankmega.certification.service;

import com.bankmega.certification.dto.CertificationRequest;
import com.bankmega.certification.dto.CertificationResponse;
import com.bankmega.certification.entity.Certification;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.CertificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificationService {

    private final CertificationRepository repo;

    public List<CertificationResponse> getAll() {
        return repo.findByDeletedAtIsNull().stream()
                .sorted(Comparator.comparing(Certification::getCode, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
    }

    public CertificationResponse getById(Long id) {
        Certification cert = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification not found"));
        return toResponse(cert);
    }

    public CertificationResponse create(CertificationRequest req) {
        if (repo.existsByCode(req.getCode())) {
            throw new ConflictException("Certification code " + req.getCode() + " already exists");
        }
        if (repo.existsByName(req.getName())) {
            throw new ConflictException("Certification name " + req.getName() + " already exists");
        }

        Certification cert = Certification.builder()
                .code(req.getCode())
                .name(req.getName())
                .build();

        return toResponse(repo.save(java.util.Objects.requireNonNull(cert)));
    }

    public CertificationResponse update(Long id, CertificationRequest req) {
        Certification cert = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification not found"));

        if (!cert.getCode().equals(req.getCode()) && repo.existsByCode(req.getCode())) {
            throw new ConflictException("Certification code " + req.getCode() + " already exists");
        }
        if (!cert.getName().equals(req.getName()) && repo.existsByName(req.getName())) {
            throw new ConflictException("Certification name " + req.getName() + " already exists");
        }

        cert.setCode(req.getCode());
        cert.setName(req.getName());

        return toResponse(repo.save(cert));
    }

    public void softDelete(Long id) {
        Certification cert = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification not found"));

        cert.setDeletedAt(Instant.now());
        repo.save(cert);
    }

    private CertificationResponse toResponse(Certification c) {
        return CertificationResponse.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .deletedAt(c.getDeletedAt())
                .build();
    }
}