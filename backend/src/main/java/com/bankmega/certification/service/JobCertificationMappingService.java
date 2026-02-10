package com.bankmega.certification.service;

import com.bankmega.certification.dto.CertificationLevelResponse;
import com.bankmega.certification.dto.CertificationResponse;
import com.bankmega.certification.dto.JobCertificationMappingRequest;
import com.bankmega.certification.dto.JobCertificationMappingResponse;
import com.bankmega.certification.dto.JobPositionResponse;
import com.bankmega.certification.dto.SubFieldResponse;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.JobCertificationMapping;
import com.bankmega.certification.entity.JobPosition;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.JobCertificationMappingRepository;
import com.bankmega.certification.repository.JobPositionRepository;
import com.bankmega.certification.specification.JobCertificationMappingSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class JobCertificationMappingService {

        private final JobCertificationMappingRepository mappingRepo;
        private final JobPositionRepository jobPositionRepo;
        private final CertificationRuleRepository ruleRepo;
        private final EmployeeEligibilityService eligibilityService;

        // 🔹 Convert entity → DTO Response
        private JobCertificationMappingResponse toResponse(JobCertificationMapping m) {
                CertificationRule rule = m.getCertificationRule();

                return JobCertificationMappingResponse.builder()
                                .id(m.getId())
                                .jobPositionId(m.getJobPosition().getId())
                                .jobName(m.getJobPosition().getName())

                                .certificationRuleId(rule.getId())
                                .certificationName(rule.getCertification() != null ? rule.getCertification().getName()
                                                : null)
                                .certificationCode(rule.getCertification() != null ? rule.getCertification().getCode()
                                                : null)
                                .certificationLevelName(
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getName()
                                                                : null)
                                .certificationLevelLevel(
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getLevel()
                                                                : null)
                                .subFieldName(rule.getSubField() != null ? rule.getSubField().getName() : null)
                                .subFieldCode(rule.getSubField() != null ? rule.getSubField().getCode() : null)

                                .isActive(m.getIsActive())
                                .createdAt(m.getCreatedAt())
                                .updatedAt(m.getUpdatedAt())
                                .build();
        }

        // 🔹 Paging + Filter + Search (support multi-select filter +
        // allowedCertificationIds)
        @Transactional(readOnly = true)
        public Page<JobCertificationMappingResponse> getPagedFiltered(
                        List<Long> jobIds,
                        List<String> certCodes,
                        List<Integer> levels,
                        List<String> subCodes,
                        String status,
                        String search,
                        List<Long> allowedCertificationIds,
                        Pageable pageable) {
                Specification<JobCertificationMapping> spec = JobCertificationMappingSpecification.notDeleted()
                                .and(JobCertificationMappingSpecification.byJobIds(jobIds))
                                .and(JobCertificationMappingSpecification.byCertCodes(certCodes))
                                .and(JobCertificationMappingSpecification.byLevels(levels))
                                .and(JobCertificationMappingSpecification.bySubCodes(subCodes))
                                .and(JobCertificationMappingSpecification.byStatus(status))
                                .and(JobCertificationMappingSpecification.bySearch(search))
                                .and(JobCertificationMappingSpecification
                                                .byAllowedCertificationIds(allowedCertificationIds));

                return mappingRepo.findAll(spec, Objects.requireNonNull(pageable)).map(this::toResponse);
        }

        // 🔹 Create baru
        @Transactional
        public JobCertificationMappingResponse create(JobCertificationMappingRequest req) {
                // Cek duplikat (job + rule) yang belum soft-delete
                if (mappingRepo.existsByJobPosition_IdAndCertificationRule_IdAndDeletedAtIsNull(
                                req.getJobPositionId(), req.getCertificationRuleId())) {
                        throw new IllegalArgumentException("Mapping sudah ada untuk kombinasi ini");
                }

                JobPosition job = jobPositionRepo.findById(Objects.requireNonNull(req.getJobPositionId()))
                                .orElseThrow(() -> new IllegalArgumentException("Job Position tidak ditemukan"));

                CertificationRule rule = ruleRepo.findById(Objects.requireNonNull(req.getCertificationRuleId()))
                                .orElseThrow(() -> new IllegalArgumentException("Certification Rule tidak ditemukan"));

                JobCertificationMapping mapping = JobCertificationMapping.builder()
                                .jobPosition(job)
                                .certificationRule(rule)
                                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                                .createdAt(Instant.now())
                                .updatedAt(Instant.now())
                                .build();

                JobCertificationMapping saved = mappingRepo.save(Objects.requireNonNull(mapping));

                // Auto-refresh eligibility for employees with this job position
                try {
                        eligibilityService.refreshEligibilityForJobPosition(job.getId());
                        log.info("Refreshed eligibility for jobPositionId={} after mapping created", job.getId());
                } catch (Exception e) {
                        log.warn("Failed to refresh eligibility for jobPositionId={}: {}", job.getId(), e.getMessage());
                }

                return toResponse(saved);
        }

        // 🔹 Update mapping
        @Transactional
        public JobCertificationMappingResponse update(Long id, JobCertificationMappingRequest req) {
                JobCertificationMapping mapping = mappingRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new IllegalArgumentException("Mapping tidak ditemukan"));

                if (req.getJobPositionId() != null) {
                        mapping.setJobPosition(jobPositionRepo.findById(Objects.requireNonNull(req.getJobPositionId()))
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Job Position tidak ditemukan")));
                }

                if (req.getCertificationRuleId() != null) {
                        mapping.setCertificationRule(
                                        ruleRepo.findById(Objects.requireNonNull(req.getCertificationRuleId()))
                                                        .orElseThrow(() -> new IllegalArgumentException(
                                                                        "Certification Rule tidak ditemukan")));
                }

                if (req.getIsActive() != null) {
                        mapping.setIsActive(req.getIsActive());
                }

                mapping.setUpdatedAt(Instant.now());
                JobCertificationMapping saved = mappingRepo.save(mapping);

                // Auto-refresh eligibility for employees with this job position
                try {
                        eligibilityService.refreshEligibilityForJobPosition(mapping.getJobPosition().getId());
                        log.info("Refreshed eligibility for jobPositionId={} after mapping updated",
                                        mapping.getJobPosition().getId());
                } catch (Exception e) {
                        log.warn("Failed to refresh eligibility for jobPositionId={}: {}",
                                        mapping.getJobPosition().getId(), e.getMessage());
                }

                return toResponse(saved);
        }

        // 🔹 Toggle aktif/nonaktif
        @Transactional
        public JobCertificationMappingResponse toggle(Long id) {
                JobCertificationMapping mapping = mappingRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new IllegalArgumentException("Mapping tidak ditemukan"));

                mapping.setIsActive(!mapping.getIsActive());
                mapping.setUpdatedAt(Instant.now());

                JobCertificationMapping saved = mappingRepo.save(mapping);

                // Auto-refresh eligibility for employees with this job position
                try {
                        eligibilityService.refreshEligibilityForJobPosition(mapping.getJobPosition().getId());
                        log.info("Refreshed eligibility for jobPositionId={} after mapping toggled",
                                        mapping.getJobPosition().getId());
                } catch (Exception e) {
                        log.warn("Failed to refresh eligibility for jobPositionId={}: {}",
                                        mapping.getJobPosition().getId(), e.getMessage());
                }

                return toResponse(saved);
        }

        // 🔹 Soft delete mapping
        @Transactional
        public void delete(Long id) {
                JobCertificationMapping mapping = mappingRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new IllegalArgumentException("Mapping tidak ditemukan"));

                mapping.setIsActive(false);
                mapping.setDeletedAt(Instant.now());
                mapping.setUpdatedAt(Instant.now());

                Long jobPosId = mapping.getJobPosition().getId();
                mappingRepo.save(mapping);

                // Auto-refresh eligibility for employees with this job position
                try {
                        eligibilityService.refreshEligibilityForJobPosition(jobPosId);
                        log.info("Refreshed eligibility for jobPositionId={} after mapping deleted", jobPosId);
                } catch (Exception e) {
                        log.warn("Failed to refresh eligibility for jobPositionId={}: {}", jobPosId, e.getMessage());
                }
        }

        // 🔹 Ambil semua mapping aktif untuk 1 jabatan
        @Transactional(readOnly = true)
        public List<JobCertificationMapping> getActiveMappingsByJobPosition(Long jobPositionId) {
                return mappingRepo.findAll(
                                JobCertificationMappingSpecification.notDeleted()
                                                .and(JobCertificationMappingSpecification
                                                                .byJobIds(List.of(jobPositionId)))
                                                .and(JobCertificationMappingSpecification.byStatus("active")));
        }

        // ================== FILTER OPTIONS (Distinct values from mappings)
        // ==================

        @Transactional(readOnly = true)
        public Page<JobPositionResponse> getDistinctJobPositions(String search, int page, int size) {
                Pageable pageable = PageRequest.of(page, size);
                return mappingRepo.findDistinctJobPositions(search, pageable)
                                .map(jp -> JobPositionResponse.builder()
                                                .id(jp.getId())
                                                .name(jp.getName())
                                                .isActive(jp.getIsActive())
                                                .createdAt(jp.getCreatedAt())
                                                .updatedAt(jp.getUpdatedAt())
                                                .build());
        }

        @Transactional(readOnly = true)
        public Page<CertificationResponse> getDistinctCertifications(String search, int page, int size) {
                Pageable pageable = PageRequest.of(page, size);
                return mappingRepo.findDistinctCertifications(search, pageable)
                                .map(c -> CertificationResponse.builder()
                                                .id(c.getId())
                                                .code(c.getCode())
                                                .name(c.getName())
                                                .createdAt(c.getCreatedAt())
                                                .updatedAt(c.getUpdatedAt())
                                                .deletedAt(c.getDeletedAt())
                                                .build());
        }

        @Transactional(readOnly = true)
        public Page<CertificationLevelResponse> getDistinctLevels(String search, int page, int size) {
                Pageable pageable = PageRequest.of(page, size);
                return mappingRepo.findDistinctCertificationLevels(search, pageable)
                                .map(l -> CertificationLevelResponse.builder()
                                                .id(l.getId())
                                                .level(l.getLevel())
                                                .name(l.getName())
                                                .createdAt(l.getCreatedAt())
                                                .updatedAt(l.getUpdatedAt())
                                                .deletedAt(l.getDeletedAt())
                                                .build());
        }

        @Transactional(readOnly = true)
        public Page<SubFieldResponse> getDistinctSubFields(String search, int page, int size) {
                Pageable pageable = PageRequest.of(page, size);
                return mappingRepo.findDistinctSubFields(search, pageable)
                                .map(s -> SubFieldResponse.builder()
                                                .id(s.getId())
                                                .code(s.getCode())
                                                .name(s.getName())
                                                .certificationId(s.getCertification().getId())
                                                .certificationName(s.getCertification().getName())
                                                .certificationCode(s.getCertification().getCode())
                                                .createdAt(s.getCreatedAt())
                                                .updatedAt(s.getUpdatedAt())
                                                .deletedAt(s.getDeletedAt())
                                                .build());
        }
}
