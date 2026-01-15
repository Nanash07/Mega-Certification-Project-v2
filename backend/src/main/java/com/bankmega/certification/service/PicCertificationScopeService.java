package com.bankmega.certification.service;

import com.bankmega.certification.dto.PicCertificationScopeRequest;
import com.bankmega.certification.dto.PicCertificationScopeResponse;
import com.bankmega.certification.entity.Certification;
import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.CertificationRepository;
import com.bankmega.certification.repository.PicCertificationScopeRepository;
import com.bankmega.certification.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PicCertificationScopeService {

        private final PicCertificationScopeRepository scopeRepo;
        private final UserRepository userRepo;
        private final CertificationRepository certRepo;

        public List<PicCertificationScopeResponse> getAll() {
                return userRepo.findByDeletedAtIsNull().stream()
                                .filter(u -> u.getRole() != null && "PIC".equalsIgnoreCase(u.getRole().getName()))
                                .map(this::mapUserToResponse)
                                .toList();
        }

        public PicCertificationScopeResponse getByUser(Long userId) {
                User user = userRepo.findById(Objects.requireNonNull(userId))
                                .orElseThrow(() -> new NotFoundException("User not found: " + userId));
                return mapUserToResponse(user);
        }

        @Transactional
        public PicCertificationScopeResponse updateScope(Long userId, PicCertificationScopeRequest req) {
                User user = userRepo.findById(Objects.requireNonNull(userId))
                                .orElseThrow(() -> new NotFoundException("User not found: " + userId));

                List<PicCertificationScope> existing = scopeRepo.findByUser_Id(user.getId());
                Set<Long> existingIds = existing.stream()
                                .map(s -> s.getCertification().getId())
                                .collect(Collectors.toSet());

                Set<Long> newIds = new HashSet<>(req.getCertificationIds());

                if (existingIds.equals(newIds)) {
                        return mapUserToResponse(user);
                }

                existing.stream()
                                .filter(s -> !newIds.contains(s.getCertification().getId()))
                                .forEach(scopeRepo::delete);

                newIds.stream()
                                .filter(id -> !existingIds.contains(id))
                                .forEach(certId -> {
                                        Certification c = certRepo.findById(Objects.requireNonNull(certId))
                                                        .orElseThrow(() -> new NotFoundException(
                                                                        "Certification not found: " + certId));
                                        scopeRepo.save(Objects.requireNonNull(PicCertificationScope.builder()
                                                        .user(user)
                                                        .certification(c)
                                                        .build()));
                                });

                return mapUserToResponse(user);
        }

        private PicCertificationScopeResponse mapUserToResponse(User user) {
                var certs = scopeRepo.findByUser_Id(user.getId()).stream()
                                .sorted(Comparator.comparing(scope -> {
                                        var cert = scope.getCertification();
                                        return cert != null && cert.getCode() != null ? cert.getCode() : "";
                                }, String.CASE_INSENSITIVE_ORDER))
                                .map(s -> PicCertificationScopeResponse.ScopeDto.builder()
                                                .certificationId(s.getCertification().getId())
                                                .certificationCode(s.getCertification().getCode())
                                                .build())
                                .toList();

                return PicCertificationScopeResponse.builder()
                                .userId(user.getId())
                                .username(user.getUsername())
                                .email(user.getResolvedEmail())
                                .createdAt(user.getCreatedAt())
                                .updatedAt(user.getUpdatedAt())
                                .certifications(certs)
                                .build();
        }
}
