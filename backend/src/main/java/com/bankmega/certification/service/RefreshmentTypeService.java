package com.bankmega.certification.service;

import com.bankmega.certification.dto.RefreshmentTypeRequest;
import com.bankmega.certification.dto.RefreshmentTypeResponse;
import com.bankmega.certification.entity.RefreshmentType;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.RefreshmentTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class RefreshmentTypeService {

    private final RefreshmentTypeRepository repo;

    public List<RefreshmentTypeResponse> getAll() {
        return repo.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public RefreshmentTypeResponse getById(Long id) {
        RefreshmentType type = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Refreshment type not found with id " + id));
        return toResponse(type);
    }

    public RefreshmentTypeResponse create(RefreshmentTypeRequest req) {
        if (repo.existsByName(req.getName())) {
            throw new IllegalArgumentException("Refreshment type with name " + req.getName() + " already exists");
        }

        RefreshmentType type = RefreshmentType.builder()
                .name(req.getName())
                .build();

        return toResponse(repo.save(Objects.requireNonNull(type)));
    }

    public RefreshmentTypeResponse update(Long id, RefreshmentTypeRequest req) {
        RefreshmentType type = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Refreshment type not found with id " + id));

        type.setName(req.getName());

        return toResponse(repo.save(type));
    }

    public void delete(Long id) {
        RefreshmentType type = repo.findById(Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Refreshment type not found with id " + id));
        repo.delete(Objects.requireNonNull(type));
    }

    private RefreshmentTypeResponse toResponse(RefreshmentType type) {
        return RefreshmentTypeResponse.builder()
                .id(type.getId())
                .name(type.getName())
                .createdAt(type.getCreatedAt())
                .updatedAt(type.getUpdatedAt())
                .build();
    }
}