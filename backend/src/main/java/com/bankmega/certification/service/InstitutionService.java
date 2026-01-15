package com.bankmega.certification.service;

import com.bankmega.certification.dto.InstitutionRequest;
import com.bankmega.certification.dto.InstitutionResponse;
import com.bankmega.certification.entity.Institution;
import com.bankmega.certification.repository.InstitutionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InstitutionService {

    private final InstitutionRepository institutionRepository;

    @Transactional
    public InstitutionResponse create(InstitutionRequest req) {
        Institution institution = Institution.builder()
                .name(req.getName())
                .type(req.getType())
                .address(req.getAddress())
                .contactPerson(req.getContactPerson())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        return toResponse(institutionRepository.save(Objects.requireNonNull(institution)));
    }

    public List<InstitutionResponse> getAll() {
        return institutionRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public InstitutionResponse getById(Long id) {
        Institution institution = institutionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new IllegalArgumentException("Institution tidak ditemukan"));
        return toResponse(institution);
    }

    @Transactional
    public InstitutionResponse update(Long id, InstitutionRequest req) {
        Institution institution = institutionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new IllegalArgumentException("Institution tidak ditemukan"));

        institution.setName(req.getName());
        institution.setType(req.getType());
        institution.setAddress(req.getAddress());
        institution.setContactPerson(req.getContactPerson());
        institution.setUpdatedAt(LocalDateTime.now());

        return toResponse(institutionRepository.save(institution));
    }

    @Transactional
    public void delete(Long id) {
        Institution institution = institutionRepository.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new IllegalArgumentException("Institution tidak ditemukan"));
        institutionRepository.delete(Objects.requireNonNull(institution));
    }

    private InstitutionResponse toResponse(Institution i) {
        return InstitutionResponse.builder()
                .id(i.getId())
                .name(i.getName())
                .type(i.getType())
                .address(i.getAddress())
                .contactPerson(i.getContactPerson())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .build();
    }
}