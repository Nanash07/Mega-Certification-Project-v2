package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeCertificationHistoryResponse;
import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.EmployeeCertificationHistory;
import com.bankmega.certification.repository.EmployeeCertificationHistoryRepository;
import com.bankmega.certification.specification.EmployeeCertificationHistorySpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EmployeeCertificationHistoryService {

        private final EmployeeCertificationHistoryRepository historyRepo;

        // ================== SNAPSHOT ==================
        public void snapshot(EmployeeCertification ec, EmployeeCertificationHistory.ActionType actionType) {
                // Kalau UPDATE, cek dulu apakah ada perubahan nyata
                if (actionType == EmployeeCertificationHistory.ActionType.UPDATED && !hasChanged(ec)) {
                        return; // skip, ga perlu catet history
                }

                EmployeeCertificationHistory history = EmployeeCertificationHistory.builder()
                                .employeeCertification(ec)

                                // 🔹 Snapshot employee
                                .employeeId(ec.getEmployee().getId())
                                .employeeNip(ec.getEmployee().getNip())
                                .employeeName(ec.getEmployee().getName())
                                .jobPositionTitle(ec.getJobPositionTitle())

                                // 🔹 Snapshot certification rule
                                .certificationRuleId(ec.getCertificationRule().getId())
                                .certificationName(ec.getCertificationRule().getCertification().getName())
                                .certificationCode(ec.getCertificationRule().getCertification().getCode())
                                .certificationLevelName(ec.getCertificationRule().getCertificationLevel() != null
                                                ? ec.getCertificationRule().getCertificationLevel().getName()
                                                : null)
                                .certificationLevelLevel(ec.getCertificationRule().getCertificationLevel() != null
                                                ? ec.getCertificationRule().getCertificationLevel().getLevel()
                                                : null)
                                .subFieldCode(ec.getCertificationRule().getSubField() != null
                                                ? ec.getCertificationRule().getSubField().getCode()
                                                : null)
                                .subFieldName(ec.getCertificationRule().getSubField() != null
                                                ? ec.getCertificationRule().getSubField().getName()
                                                : null)

                                // 🔹 Snapshot institution
                                .institutionId(ec.getInstitution() != null ? ec.getInstitution().getId() : null)
                                .institutionName(ec.getInstitution() != null ? ec.getInstitution().getName() : null)

                                // 🔹 Snapshot detail cert
                                .certNumber(ec.getCertNumber())
                                .certDate(ec.getCertDate())
                                .validFrom(ec.getValidFrom())
                                .validUntil(ec.getValidUntil())
                                .reminderDate(ec.getReminderDate())

                                // 🔹 File snapshot
                                .fileUrl(ec.getFileUrl())
                                .fileName(ec.getFileName())
                                .fileType(ec.getFileType())

                                // 🔹 Status
                                .status(ec.getStatus())

                                // 🔹 Action
                                .actionType(actionType)

                                .build();

                historyRepo.save(java.util.Objects.requireNonNull(history));
        }

        // ================== CHANGE DETECTION ==================
        private boolean hasChanged(EmployeeCertification ec) {
                EmployeeCertificationHistory last = historyRepo
                                .findTopByEmployeeCertificationIdOrderByActionAtDesc(ec.getId())
                                .orElse(null);

                if (last == null)
                        return true;

                return !Objects.equals(last.getCertNumber(), ec.getCertNumber()) ||
                                !Objects.equals(last.getCertDate(), ec.getCertDate()) ||
                                !Objects.equals(last.getValidUntil(), ec.getValidUntil()) ||
                                !Objects.equals(last.getInstitutionId(),
                                                ec.getInstitution() != null ? ec.getInstitution().getId() : null)
                                ||
                                !Objects.equals(last.getStatus(), ec.getStatus()) ||
                                !Objects.equals(last.getFileUrl(), ec.getFileUrl()) ||
                                !Objects.equals(last.getFileName(), ec.getFileName());
        }

        // ================== GET HISTORY (Paged + Filter) ==================
        @Transactional(readOnly = true)
        public Page<EmployeeCertificationHistoryResponse> getPagedHistory(
                        Long certificationId,
                        String actionType,
                        String search,
                        Pageable pageable) {

                Specification<EmployeeCertificationHistory> spec = EmployeeCertificationHistorySpecification
                                .byCertificationId(certificationId)
                                .and(EmployeeCertificationHistorySpecification.byActionType(actionType))
                                .and(EmployeeCertificationHistorySpecification.bySearch(search));

                Pageable sortedPageable = PageRequest.of(
                                pageable.getPageNumber(),
                                pageable.getPageSize(),
                                Sort.by(Sort.Direction.DESC, "actionAt") // selalu terbaru duluan
                );

                return historyRepo.findAll(spec, sortedPageable).map(this::toResponse);
        }

        private EmployeeCertificationHistoryResponse toResponse(EmployeeCertificationHistory h) {
                return EmployeeCertificationHistoryResponse.builder()
                                .id(h.getId())
                                .certificationId(h.getEmployeeCertification().getId())
                                .employeeId(h.getEmployeeId())
                                .employeeNip(h.getEmployeeNip())
                                .employeeName(h.getEmployeeName())
                                .jobPositionTitle(h.getJobPositionTitle())
                                .certificationRuleId(h.getCertificationRuleId())
                                .certificationName(h.getCertificationName())
                                .certificationCode(h.getCertificationCode())
                                .certificationLevelName(h.getCertificationLevelName())
                                .certificationLevelLevel(h.getCertificationLevelLevel())
                                .subFieldCode(h.getSubFieldCode())
                                .subFieldName(h.getSubFieldName())
                                .institutionId(h.getInstitutionId())
                                .institutionName(h.getInstitutionName())
                                .certNumber(h.getCertNumber())
                                .certDate(h.getCertDate())
                                .validFrom(h.getValidFrom())
                                .validUntil(h.getValidUntil())
                                .reminderDate(h.getReminderDate())
                                .fileUrl(h.getFileUrl())
                                .fileName(h.getFileName())
                                .fileType(h.getFileType())
                                .status(h.getStatus())

                                .actionType(h.getActionType())
                                .actionAt(h.getActionAt())
                                .build();
        }
}
