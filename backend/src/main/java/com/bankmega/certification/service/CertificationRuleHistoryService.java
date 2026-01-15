package com.bankmega.certification.service;

import com.bankmega.certification.dto.CertificationRuleHistoryResponse;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.CertificationRuleHistory;
import com.bankmega.certification.repository.CertificationRuleHistoryRepository;
import com.bankmega.certification.specification.CertificationRuleHistorySpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class CertificationRuleHistoryService {

        private final CertificationRuleHistoryRepository historyRepo;

        // ================== SNAPSHOT ==================
        public void snapshot(CertificationRule rule, CertificationRuleHistory.ActionType actionType) {
                if (actionType == CertificationRuleHistory.ActionType.UPDATED && !hasChanged(rule)) {
                        return; // skip kalau ga ada perubahan
                }

                CertificationRuleHistory history = CertificationRuleHistory.builder()
                                .certificationRule(rule)
                                .certificationId(rule.getCertification().getId())
                                .certificationName(rule.getCertification().getName())
                                .certificationCode(rule.getCertification().getCode())
                                .certificationLevelId(
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getId()
                                                                : null)
                                .certificationLevelName(
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getName()
                                                                : null)
                                .certificationLevelLevel(
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getLevel()
                                                                : null)
                                .subFieldId(rule.getSubField() != null ? rule.getSubField().getId() : null)
                                .subFieldCode(rule.getSubField() != null ? rule.getSubField().getCode() : null)
                                .subFieldName(rule.getSubField() != null ? rule.getSubField().getName() : null)
                                .validityMonths(rule.getValidityMonths())
                                .reminderMonths(rule.getReminderMonths())
                                .wajibSetelahMasuk(rule.getWajibSetelahMasuk())
                                .refreshmentTypeName(
                                                rule.getRefreshmentType() != null ? rule.getRefreshmentType().getName()
                                                                : null)
                                .isActive(rule.getIsActive())
                                .actionType(actionType)
                                .actionAt(Instant.now())
                                .build();

                historyRepo.save(Objects.requireNonNull(history));
        }

        // ================== CHANGE DETECTION ==================
        private boolean hasChanged(CertificationRule rule) {
                CertificationRuleHistory last = historyRepo
                                .findTopByCertificationRuleIdOrderByActionAtDesc(rule.getId())
                                .orElse(null);

                if (last == null)
                        return true;

                return !Objects.equals(last.getCertificationId(), rule.getCertification().getId())
                                || !Objects.equals(last.getCertificationLevelId(),
                                                rule.getCertificationLevel() != null
                                                                ? rule.getCertificationLevel().getId()
                                                                : null)
                                || !Objects.equals(last.getSubFieldId(),
                                                rule.getSubField() != null ? rule.getSubField().getId() : null)
                                || !Objects.equals(last.getValidityMonths(), rule.getValidityMonths())
                                || !Objects.equals(last.getReminderMonths(), rule.getReminderMonths())
                                || !Objects.equals(last.getWajibSetelahMasuk(), rule.getWajibSetelahMasuk())
                                || !Objects.equals(last.getRefreshmentTypeName(),
                                                rule.getRefreshmentType() != null ? rule.getRefreshmentType().getName()
                                                                : null)
                                || !Objects.equals(last.getIsActive(), rule.getIsActive());
        }

        // ================== GET HISTORY (Paged + Filter) ==================
        @Transactional(readOnly = true)
        public Page<CertificationRuleHistoryResponse> getPagedHistory(
                        Long ruleId,
                        String actionType,
                        String search,
                        Pageable pageable) {

                Specification<CertificationRuleHistory> spec = CertificationRuleHistorySpecification.byRuleId(ruleId)
                                .and(CertificationRuleHistorySpecification.byActionType(actionType))
                                .and(CertificationRuleHistorySpecification.bySearch(search));

                // 🔹 Force sorting by actionAt desc
                Pageable sortedPageable = PageRequest.of(
                                pageable.getPageNumber(),
                                pageable.getPageSize(),
                                Sort.by(Sort.Direction.DESC, "actionAt"));

                return historyRepo.findAll(spec, sortedPageable).map(this::toResponse);
        }

        private CertificationRuleHistoryResponse toResponse(CertificationRuleHistory h) {
                return CertificationRuleHistoryResponse.builder()
                                .id(h.getId())
                                .certificationRuleId(h.getCertificationRule().getId())
                                .certificationId(h.getCertificationId())
                                .certificationName(h.getCertificationName())
                                .certificationCode(h.getCertificationCode())
                                .certificationLevelId(h.getCertificationLevelId())
                                .certificationLevelName(h.getCertificationLevelName())
                                .certificationLevelLevel(h.getCertificationLevelLevel())
                                .subFieldId(h.getSubFieldId())
                                .subFieldCode(h.getSubFieldCode())
                                .subFieldName(h.getSubFieldName())
                                .validityMonths(h.getValidityMonths())
                                .reminderMonths(h.getReminderMonths())
                                .wajibSetelahMasuk(h.getWajibSetelahMasuk())
                                .refreshmentTypeName(h.getRefreshmentTypeName())
                                .isActive(h.getIsActive())
                                .actionType(h.getActionType())
                                .actionAt(h.getActionAt())
                                .build();
        }
}
