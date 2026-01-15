package com.bankmega.certification.service;

import com.bankmega.certification.dto.CertificationLevelRequest;
import com.bankmega.certification.dto.CertificationLevelResponse;
import com.bankmega.certification.entity.CertificationLevel;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.CertificationLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificationLevelService {

    private final CertificationLevelRepository repo;

    public List<CertificationLevelResponse> getAll() {
        return repo.findByDeletedAtIsNull().stream()
                .sorted(Comparator.comparing(CertificationLevel::getLevel))
                .map(this::toResponse)
                .toList();
    }

    public CertificationLevelResponse getById(Long id) {
        CertificationLevel lvl = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification level not found"));
        return toResponse(lvl);
    }

    public CertificationLevelResponse create(CertificationLevelRequest req) {
        if (repo.existsByLevel(req.getLevel())) {
            throw new ConflictException("Certification level " + req.getLevel() + " already exists");
        }
        if (repo.existsByName(req.getName())) {
            throw new ConflictException("Certification level name " + req.getName() + " already exists");
        }

        CertificationLevel lvl = CertificationLevel.builder()
                .level(req.getLevel())
                .name(req.getName())
                .build();

        return toResponse(repo.save(java.util.Objects.requireNonNull(lvl)));
    }

    public CertificationLevelResponse update(Long id, CertificationLevelRequest req) {
        CertificationLevel lvl = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification level not found"));

        if (!lvl.getLevel().equals(req.getLevel()) && repo.existsByLevel(req.getLevel())) {
            throw new ConflictException("Certification level " + req.getLevel() + " already exists");
        }
        if (!lvl.getName().equals(req.getName()) && repo.existsByName(req.getName())) {
            throw new ConflictException("Certification level name " + req.getName() + " already exists");
        }

        lvl.setLevel(req.getLevel());
        lvl.setName(req.getName());

        return toResponse(repo.save(lvl));
    }

    public void softDelete(Long id) {
        CertificationLevel lvl = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Certification level not found"));
        lvl.setDeletedAt(Instant.now());
        repo.save(lvl);
    }

    private CertificationLevelResponse toResponse(CertificationLevel lvl) {
        return CertificationLevelResponse.builder()
                .id(lvl.getId())
                .level(lvl.getLevel())
                .name(lvl.getName())
                .createdAt(lvl.getCreatedAt())
                .updatedAt(lvl.getUpdatedAt())
                .deletedAt(lvl.getDeletedAt())
                .build();
    }
}