// src/main/java/com/bankmega/certification/service/BatchService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.BatchRequest;
import com.bankmega.certification.dto.BatchResponse;
import com.bankmega.certification.dto.dashboard.MonthlyPoint;
import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.entity.Institution;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.BatchRepository;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeBatchRepository;
import com.bankmega.certification.repository.InstitutionRepository;
import com.bankmega.certification.specification.BatchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional
public class BatchService {

    private final BatchRepository batchRepository;
    private final CertificationRuleRepository certificationRuleRepository;
    private final InstitutionRepository institutionRepository;
    private final EmployeeBatchRepository employeeBatchRepository;

    // ============================================================
    // CREATE
    // ============================================================
    public BatchResponse create(BatchRequest request, String createdBy) {
        Batch.BatchType type = request.getType() != null ? request.getType() : Batch.BatchType.CERTIFICATION;
        validateQuota(request.getQuota());
        validateDates(request.getStartDate(), request.getEndDate());
        validateRuleByType(type, request.getCertificationRuleId(), true);

        Batch batch = fromRequest(request, null);
        if (batch.getStatus() == null) {
            batch.setStatus(Batch.Status.PLANNED);
        }
        if (batch.getType() == null) {
            batch.setType(Batch.BatchType.CERTIFICATION);
        }

        batch.setCreatedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());

        return toResponse(batchRepository.save(batch));
    }

    // ============================================================
    // UPDATE
    // ============================================================
    public BatchResponse update(Long id, BatchRequest request, String updatedBy) {
        Batch existing = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));

        validateQuota(request.getQuota());
        validateDates(request.getStartDate(), request.getEndDate());

        Batch.BatchType targetType = request.getType() != null ? request.getType() : existing.getType();
        validateRuleByType(targetType, request.getCertificationRuleId(), false);

        if (request.getStatus() != null && !Objects.equals(existing.getStatus(), request.getStatus())) {
            validateBatchStatusTransition(existing.getStatus(), request.getStatus());
        }

        CertificationRule resolvedRule = resolveRuleForUpdate(targetType, existing, request.getCertificationRuleId());

        Institution institution = request.getInstitutionId() != null
                ? resolveInstitutionNullable(request.getInstitutionId())
                : existing.getInstitution();

        existing.setBatchName(request.getBatchName() != null ? request.getBatchName() : existing.getBatchName());
        existing.setCertificationRule(resolvedRule);
        existing.setInstitution(institution);
        existing.setStartDate(request.getStartDate() != null ? request.getStartDate() : existing.getStartDate());
        existing.setEndDate(request.getEndDate() != null ? request.getEndDate() : existing.getEndDate());
        existing.setQuota(request.getQuota() != null ? request.getQuota() : existing.getQuota());
        existing.setStatus(request.getStatus() != null ? request.getStatus() : existing.getStatus());
        existing.setType(targetType);
        existing.setUpdatedAt(Instant.now());

        return toResponse(batchRepository.save(existing));
    }

    // ============================================================
    // GET BY ID
    // ============================================================
    @Transactional(readOnly = true)
    public BatchResponse getByIdResponse(Long id) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));
        return toResponse(batch);
    }

    // ============================================================
    // DELETE (SOFT)
    // ============================================================
    public void delete(Long id, String deletedBy) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));
        batch.setDeletedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());
        batchRepository.save(batch);
    }

    // ============================================================
    // SEARCH + FILTER + PAGING (Superadmin, PIC, Employee)
    // ============================================================
    @Transactional(readOnly = true)
    public Page<BatchResponse> search(
            String search,
            Batch.Status status,
            Batch.BatchType type,
            Long certificationRuleId,
            Long institutionId,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            List<Long> allowedCertificationIds,
            Long employeeId,
            Pageable pageable) {

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.bySearch(search))
                .and(BatchSpecification.byStatus(status))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byCertificationRule(certificationRuleId))
                .and(BatchSpecification.byInstitution(institutionId))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    Sort.by(Sort.Order.desc("startDate"), Sort.Order.asc("batchName")));
        }

        return batchRepository.findAll(spec, pageable).map(this::toResponse);
    }

    // ============================================================
    // DASHBOARD COUNT (summary batch) - fleksibel by status
    // ============================================================
    @Transactional(readOnly = true)
    public long countForDashboard(
            List<Batch.Status> statuses,
            Batch.BatchType type,
            Long certificationRuleId,
            Long institutionId,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            List<Long> allowedCertificationIds,
            Long employeeId) {
        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.byStatuses(statuses)) // boleh multi status atau null (semua)
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byCertificationRule(certificationRuleId))
                .and(BatchSpecification.byInstitution(institutionId))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        return batchRepository.count(spec);
    }

    // ============================================================
    // MONTHLY COUNT UNTUK DASHBOARD
    // ============================================================
    @Transactional(readOnly = true)
    public List<MonthlyPoint> monthlyBatchCount(
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            Batch.BatchType type,
            List<Long> allowedCertificationIds) {
        // status default: ONGOING + FINISHED (sama kayak query JDBC sebelumnya)
        List<Batch.Status> statuses = List.of(Batch.Status.ONGOING, Batch.Status.FINISHED);

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.byStatuses(statuses))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        List<Batch> batches = batchRepository.findAll(spec);

        Map<Integer, Long> grouped = batches.stream()
                .filter(b -> b.getStartDate() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getStartDate().getMonthValue(),
                        Collectors.counting()));

        // selalu balikin 12 bulan (Jan–Des)
        return IntStream.rangeClosed(1, 12)
                .mapToObj(m -> new MonthlyPoint(m, grouped.getOrDefault(m, 0L)))
                .collect(Collectors.toList());
    }

    // ============================================================
    // MAPPING
    // ============================================================
    private Batch fromRequest(BatchRequest request, Batch existingOrNull) {
        Batch.BatchType type = request.getType() != null
                ? request.getType()
                : (existingOrNull != null ? existingOrNull.getType() : Batch.BatchType.CERTIFICATION);

        CertificationRule rule = null;
        if (type == Batch.BatchType.CERTIFICATION || type == Batch.BatchType.EXTENSION) {
            rule = certificationRuleRepository.findById(request.getCertificationRuleId())
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        } else if (request.getCertificationRuleId() != null) {
            rule = certificationRuleRepository.findById(request.getCertificationRuleId())
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        }

        Institution institution = resolveInstitutionNullable(request.getInstitutionId());

        return Batch.builder()
                .batchName(request.getBatchName())
                .certificationRule(rule)
                .institution(institution)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .quota(request.getQuota())
                .status(request.getStatus() != null ? request.getStatus() : Batch.Status.PLANNED)
                .type(type != null ? type : Batch.BatchType.CERTIFICATION)
                .build();
    }

    private BatchResponse toResponse(Batch b) {
        CertificationRule rule = b.getCertificationRule();

        long totalParticipants = (b.getId() == null) ? 0L
                : employeeBatchRepository.countByBatch_IdAndDeletedAtIsNull(b.getId());
        long totalPassed = (b.getId() == null) ? 0L
                : employeeBatchRepository.countByBatch_IdAndStatusAndDeletedAtIsNull(
                        b.getId(), EmployeeBatch.Status.PASSED);

        return BatchResponse.builder()
                .id(b.getId())
                .batchName(b.getBatchName())
                .type(b.getType())
                .status(b.getStatus())

                // CertificationRule
                .certificationRuleId(rule != null ? rule.getId() : null)
                .certificationId(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getId() : null)
                .certificationName(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getName() : null)
                .certificationCode(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getCode() : null)

                // Level
                .certificationLevelId(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getId()
                                : null)
                .certificationLevelName(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getName()
                                : null)
                .certificationLevelLevel(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getLevel()
                                : null)

                // Subfield
                .subFieldId(rule != null && rule.getSubField() != null ? rule.getSubField().getId() : null)
                .subFieldName(rule != null && rule.getSubField() != null ? rule.getSubField().getName() : null)
                .subFieldCode(rule != null && rule.getSubField() != null ? rule.getSubField().getCode() : null)

                // Rule metadata
                .validityMonths(rule != null ? rule.getValidityMonths() : null)
                .reminderMonths(rule != null ? rule.getReminderMonths() : null)
                .refreshmentTypeId(
                        rule != null && rule.getRefreshmentType() != null ? rule.getRefreshmentType().getId() : null)
                .refreshmentTypeName(
                        rule != null && rule.getRefreshmentType() != null ? rule.getRefreshmentType().getName() : null)
                .wajibSetelahMasuk(rule != null ? rule.getWajibSetelahMasuk() : null)
                .isActiveRule(rule != null ? rule.getIsActive() : null)

                // Institution
                .institutionId(b.getInstitution() != null ? b.getInstitution().getId() : null)
                .institutionName(b.getInstitution() != null ? b.getInstitution().getName() : null)

                // Batch data
                .startDate(b.getStartDate())
                .endDate(b.getEndDate())
                .quota(b.getQuota())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .totalParticipants(totalParticipants)
                .totalPassed(totalPassed)
                .build();
    }

    // ============================================================
    // VALIDATION HELPERS
    // ============================================================
    private void validateQuota(Integer quota) {
        if (quota == null)
            return;
        if (quota < 1) {
            throw new IllegalArgumentException("Quota minimal 1 peserta");
        }
        if (quota > 250) {
            throw new IllegalArgumentException("Quota maksimal 250 peserta");
        }
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("Tanggal selesai tidak boleh sebelum tanggal mulai");
        }
    }

    private void validateRuleByType(Batch.BatchType type, Long ruleId, boolean isCreate) {
        if (type == null)
            return;

        if ((type == Batch.BatchType.CERTIFICATION || type == Batch.BatchType.EXTENSION)
                && ruleId == null && isCreate) {
            throw new IllegalArgumentException(
                    "CertificationRule wajib diisi untuk batch tipe " + type.name());
        }
    }

    private void validateBatchStatusTransition(Batch.Status current, Batch.Status next) {
        if (next == null) {
            throw new IllegalArgumentException("Status batch tidak boleh null");
        }
        // kalau mau rule transisi, tambahin di sini
    }

    // ============================================================
    // RESOLVERS
    // ============================================================
    private Institution resolveInstitutionNullable(Long institutionId) {
        if (institutionId == null)
            return null;
        return institutionRepository.findById(institutionId)
                .orElseThrow(() -> new NotFoundException("Institution not found"));
    }

    private CertificationRule resolveRuleForUpdate(Batch.BatchType targetType, Batch existing, Long requestedRuleId) {
        if (targetType == Batch.BatchType.CERTIFICATION || targetType == Batch.BatchType.EXTENSION) {
            Long ruleId = requestedRuleId != null
                    ? requestedRuleId
                    : (existing.getCertificationRule() != null ? existing.getCertificationRule().getId() : null);

            if (ruleId == null) {
                throw new IllegalArgumentException(
                        "CertificationRule wajib diisi untuk batch tipe " + targetType.name());
            }

            return certificationRuleRepository.findById(ruleId)
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        } else {
            if (requestedRuleId == null) {
                return existing.getCertificationRule();
            }
            return certificationRuleRepository.findById(requestedRuleId)
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        }
    }
}
