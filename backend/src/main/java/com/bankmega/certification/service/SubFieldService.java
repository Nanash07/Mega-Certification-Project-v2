package com.bankmega.certification.service;

import com.bankmega.certification.dto.SubFieldRequest;
import com.bankmega.certification.dto.SubFieldResponse;
import com.bankmega.certification.entity.Certification;
import com.bankmega.certification.entity.SubField;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.CertificationRepository;
import com.bankmega.certification.repository.SubFieldRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SubFieldService {

    private final SubFieldRepository repo;
    private final CertificationRepository certRepo;

    public List<SubFieldResponse> getAll() {
        return repo.findWithCertificationByDeletedAtIsNull().stream()
                .sorted(Comparator.comparing(SubField::getCode, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();
    }

    public SubFieldResponse getById(Long id) {
        SubField sf = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("SubField not found"));
        return toResponse(sf);
    }

    public List<SubFieldResponse> getByCertification(Long certId) {
        return repo.findByCertificationIdAndDeletedAtIsNull(certId).stream()
                .map(this::toResponse)
                .toList();
    }

    public SubFieldResponse create(SubFieldRequest req) {
        Certification cert = certRepo.findByIdAndDeletedAtIsNull(req.getCertificationId())
                .orElseThrow(() -> new NotFoundException("Certification not found"));

        if (repo.existsByCode(req.getCode())) {
            throw new ConflictException("SubField code " + req.getCode() + " already exists");
        }
        if (repo.existsByNameAndCertificationId(req.getName(), cert.getId())) {
            throw new ConflictException("SubField name " + req.getName() + " already exists in this certification");
        }

        SubField sf = SubField.builder()
                .code(req.getCode())
                .name(req.getName())
                .certification(cert)
                .build();

        return toResponse(repo.save(java.util.Objects.requireNonNull(sf)));
    }

    public SubFieldResponse update(Long id, SubFieldRequest req) {
        SubField sf = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("SubField not found"));

        Certification cert = certRepo.findByIdAndDeletedAtIsNull(req.getCertificationId())
                .orElseThrow(() -> new NotFoundException("Certification not found"));

        if (!sf.getCode().equals(req.getCode()) && repo.existsByCode(req.getCode())) {
            throw new ConflictException("SubField code " + req.getCode() + " already exists");
        }
        if (!sf.getName().equals(req.getName()) &&
                repo.existsByNameAndCertificationId(req.getName(), cert.getId())) {
            throw new ConflictException("SubField name " + req.getName() + " already exists in this certification");
        }

        sf.setCode(req.getCode());
        sf.setName(req.getName());
        sf.setCertification(cert);

        return toResponse(repo.save(sf));
    }

    public void softDelete(Long id) {
        SubField sf = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("SubField not found"));
        sf.setDeletedAt(Instant.now());
        repo.save(sf);
    }

    private SubFieldResponse toResponse(SubField sf) {
        return SubFieldResponse.builder()
                .id(sf.getId())
                .code(sf.getCode())
                .name(sf.getName())
                .certificationId(sf.getCertification().getId())
                .certificationName(sf.getCertification().getName())
                .certificationCode(sf.getCertification().getCode())
                .createdAt(sf.getCreatedAt())
                .updatedAt(sf.getUpdatedAt())
                .deletedAt(sf.getDeletedAt())
                .build();
    }
}