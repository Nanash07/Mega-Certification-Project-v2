package com.bankmega.certification.service;

import com.bankmega.certification.dto.CertificationRuleRequest;
import com.bankmega.certification.dto.CertificationRuleResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.CertificationRuleSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CertificationRuleService {

        private final CertificationRuleRepository ruleRepo;
        private final CertificationRepository certificationRepo;
        private final CertificationLevelRepository levelRepo;
        private final SubFieldRepository subFieldRepo;
        private final RefreshmentTypeRepository refreshmentRepo;
        private final CertificationRuleHistoryService historyService;

        // 🔹 Mapper entity -> DTO
        private CertificationRuleResponse toResponse(CertificationRule entity) {
                return CertificationRuleResponse.builder()
                                .id(entity.getId())
                                .certificationId(entity.getCertification().getId())
                                .certificationName(entity.getCertification().getName())
                                .certificationCode(entity.getCertification().getCode())
                                .certificationLevelId(entity.getCertificationLevel() != null
                                                ? entity.getCertificationLevel().getId()
                                                : null)
                                .certificationLevelName(entity.getCertificationLevel() != null
                                                ? entity.getCertificationLevel().getName()
                                                : null)
                                .certificationLevelLevel(entity.getCertificationLevel() != null
                                                ? entity.getCertificationLevel().getLevel()
                                                : null)
                                .subFieldId(entity.getSubField() != null ? entity.getSubField().getId() : null)
                                .subFieldName(entity.getSubField() != null ? entity.getSubField().getName() : null)
                                .subFieldCode(entity.getSubField() != null ? entity.getSubField().getCode() : null)
                                .validityMonths(entity.getValidityMonths())
                                .reminderMonths(entity.getReminderMonths())
                                .refreshmentTypeId(entity.getRefreshmentType() != null
                                                ? entity.getRefreshmentType().getId()
                                                : null)
                                .refreshmentTypeName(entity.getRefreshmentType() != null
                                                ? entity.getRefreshmentType().getName()
                                                : null)
                                .wajibSetelahMasuk(entity.getWajibSetelahMasuk())
                                .isActive(entity.getIsActive())
                                .updatedAt(entity.getUpdatedAt())
                                .createdAt(entity.getCreatedAt())
                                .build();
        }

        // 🔹 Paging + Filter + Search
        @Transactional(readOnly = true)
        public Page<CertificationRuleResponse> getPagedFiltered(
                        List<Long> certIds,
                        List<Long> levelIds,
                        List<Long> subIds,
                        String status,
                        String search,
                        Pageable pageable) {
                Specification<CertificationRule> spec = CertificationRuleSpecification.notDeleted()
                                .and(CertificationRuleSpecification.byCertIds(certIds))
                                .and(CertificationRuleSpecification.byLevelIds(levelIds))
                                .and(CertificationRuleSpecification.bySubIds(subIds))
                                .and(CertificationRuleSpecification.byStatus(status))
                                .and(CertificationRuleSpecification.bySearch(search));

                if (pageable.getSort().isUnsorted()) {
                        Sort defaultSort = Sort.by("certification.code").ascending()
                                        .and(Sort.by("certificationLevel.level").ascending())
                                        .and(Sort.by("subField.code").ascending());
                        pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), defaultSort);
                }

                return ruleRepo.findAll(spec, pageable).map(this::toResponse);
        }

        // All active rules
        @Transactional(readOnly = true)
        public List<CertificationRuleResponse> getAllActive() {
                return ruleRepo.findWithRelationsByIsActiveTrueAndDeletedAtIsNull()
                                .stream()
                                .map(this::toResponse)
                                .toList();
        }

        // All non-deleted rules
        @Transactional(readOnly = true)
        public List<CertificationRuleResponse> getAll() {
                return ruleRepo.findWithRelationsByDeletedAtIsNull().stream()
                                .sorted((a, b) -> {
                                        String keyA = (a.getCertification().getCode() != null
                                                        ? a.getCertification().getCode()
                                                        : "") + " " +
                                                        (a.getCertificationLevel() != null
                                                                        && a.getCertificationLevel().getLevel() != null
                                                                                        ? a.getCertificationLevel()
                                                                                                        .getLevel()
                                                                                        : "")
                                                        + " " +
                                                        (a.getSubField() != null && a.getSubField().getCode() != null
                                                                        ? a.getSubField().getCode()
                                                                        : "");
                                        String keyB = (b.getCertification().getCode() != null
                                                        ? b.getCertification().getCode()
                                                        : "") + " " +
                                                        (b.getCertificationLevel() != null
                                                                        && b.getCertificationLevel().getLevel() != null
                                                                                        ? b.getCertificationLevel()
                                                                                                        .getLevel()
                                                                                        : "")
                                                        + " " +
                                                        (b.getSubField() != null && b.getSubField().getCode() != null
                                                                        ? b.getSubField().getCode()
                                                                        : "");
                                        return keyA.compareToIgnoreCase(keyB);
                                })
                                .map(this::toResponse)
                                .toList();
        }

        // 🔹 Create
        @Transactional
        public CertificationRuleResponse create(CertificationRuleRequest req) {
                Certification cert = certificationRepo.findById(Objects.requireNonNull(req.getCertificationId()))
                                .orElseThrow(() -> new RuntimeException("Certification not found"));

                CertificationLevel level = req.getCertificationLevelId() != null
                                ? levelRepo.findById(Objects.requireNonNull(req.getCertificationLevelId())).orElse(null)
                                : null;

                SubField subField = req.getSubFieldId() != null
                                ? subFieldRepo.findById(Objects.requireNonNull(req.getSubFieldId())).orElse(null)
                                : null;

                RefreshmentType refreshmentType = req.getRefreshmentTypeId() != null
                                ? refreshmentRepo.findById(Objects.requireNonNull(req.getRefreshmentTypeId()))
                                                .orElse(null)
                                : null;

                CertificationRule entity = CertificationRule.builder()
                                .certification(cert)
                                .certificationLevel(level)
                                .subField(subField)
                                .validityMonths(req.getValidityMonths())
                                .reminderMonths(req.getReminderMonths())
                                .refreshmentType(refreshmentType)
                                .wajibSetelahMasuk(req.getWajibSetelahMasuk())
                                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                                .createdAt(Instant.now())
                                .updatedAt(Instant.now())
                                .build();

                CertificationRule saved = ruleRepo.save(Objects.requireNonNull(entity));
                historyService.snapshot(saved, CertificationRuleHistory.ActionType.CREATED);

                return toResponse(saved);
        }

        // 🔹 Update
        @Transactional
        public CertificationRuleResponse update(Long id, CertificationRuleRequest req) {
                CertificationRule existing = ruleRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));

                if (req.getCertificationLevelId() != null) {
                        existing.setCertificationLevel(
                                        levelRepo.findById(Objects.requireNonNull(req.getCertificationLevelId()))
                                                        .orElseThrow(() -> new RuntimeException(
                                                                        "Certification Level not found")));
                }
                if (req.getSubFieldId() != null) {
                        existing.setSubField(
                                        subFieldRepo.findById(Objects.requireNonNull(req.getSubFieldId()))
                                                        .orElseThrow(() -> new RuntimeException("SubField not found")));
                }
                if (req.getRefreshmentTypeId() != null) {
                        existing.setRefreshmentType(
                                        refreshmentRepo.findById(Objects.requireNonNull(req.getRefreshmentTypeId()))
                                                        .orElseThrow(() -> new RuntimeException(
                                                                        "Refreshment Type not found")));
                }

                existing.setValidityMonths(req.getValidityMonths());
                existing.setReminderMonths(req.getReminderMonths());
                existing.setWajibSetelahMasuk(req.getWajibSetelahMasuk());
                if (req.getIsActive() != null) {
                        existing.setIsActive(req.getIsActive());
                }
                existing.setUpdatedAt(Instant.now());

                CertificationRule saved = ruleRepo.save(existing);
                historyService.snapshot(saved, CertificationRuleHistory.ActionType.UPDATED);

                return toResponse(saved);
        }

        // 🔹 Toggle status
        @Transactional
        public CertificationRuleResponse toggleStatus(Long id) {
                CertificationRule rule = ruleRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));
                rule.setIsActive(rule.getIsActive() == null ? true : !rule.getIsActive());
                rule.setUpdatedAt(Instant.now());

                CertificationRule saved = ruleRepo.save(rule);
                historyService.snapshot(saved, CertificationRuleHistory.ActionType.UPDATED);

                return toResponse(saved);
        }

        // 🔹 Soft Delete
        @Transactional
        public void softDelete(Long id) {
                CertificationRule existing = ruleRepo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));
                existing.setIsActive(false);
                existing.setDeletedAt(Instant.now());
                existing.setUpdatedAt(Instant.now());

                CertificationRule saved = ruleRepo.save(existing);
                historyService.snapshot(saved, CertificationRuleHistory.ActionType.DELETED);
        }
}
