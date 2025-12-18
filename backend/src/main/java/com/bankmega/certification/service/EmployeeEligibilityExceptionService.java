package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeEligibilityExceptionResponse;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeEligibilityException;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeEligibilityExceptionRepository;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.specification.EmployeeEligibilityExceptionSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.JoinType;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeEligibilityExceptionService {

        private final EmployeeEligibilityExceptionRepository exceptionRepo;
        private final EmployeeRepository employeeRepo;
        private final CertificationRuleRepository ruleRepo;
        private final EmployeeEligibilityService eligibilityService;

        private EmployeeEligibilityExceptionResponse toResponse(EmployeeEligibilityException e) {
                if (e == null)
                        return null;

                var emp = e.getEmployee();
                var rule = e.getCertificationRule();

                return EmployeeEligibilityExceptionResponse.builder()
                                .id(e.getId())
                                .employeeId(emp != null ? emp.getId() : null)
                                .employeeName(emp != null ? emp.getName() : null)
                                .nip(emp != null ? emp.getNip() : null)
                                .jobPositionTitle(emp != null && emp.getJobPosition() != null
                                                ? emp.getJobPosition().getName()
                                                : null)
                                .certificationRuleId(rule != null ? rule.getId() : null)
                                .certificationCode(rule != null ? rule.getCertification().getCode() : null)
                                .certificationName(rule != null ? rule.getCertification().getName() : null)
                                .certificationLevelName(rule != null && rule.getCertificationLevel() != null
                                                ? rule.getCertificationLevel().getName()
                                                : null)
                                .certificationLevelLevel(rule != null && rule.getCertificationLevel() != null
                                                ? rule.getCertificationLevel().getLevel()
                                                : null)
                                .subFieldName(rule != null && rule.getSubField() != null ? rule.getSubField().getName()
                                                : null)
                                .subFieldCode(rule != null && rule.getSubField() != null ? rule.getSubField().getCode()
                                                : null)
                                .isActive(e.getIsActive())
                                .notes(e.getNotes())
                                .createdAt(e.getCreatedAt())
                                .updatedAt(e.getUpdatedAt())
                                .build();
        }

        @Transactional(readOnly = true)
        public Page<EmployeeEligibilityExceptionResponse> getPagedFiltered(
                        List<Long> employeeIds,
                        List<Long> jobIds,
                        List<String> certCodes,
                        List<Integer> levels,
                        List<String> subCodes,
                        String status,
                        String search,
                        Pageable pageable) {

                Specification<EmployeeEligibilityException> spec = EmployeeEligibilityExceptionSpecification
                                .notDeleted()
                                .and(EmployeeEligibilityExceptionSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeEligibilityExceptionSpecification.byJobIds(jobIds))
                                .and(EmployeeEligibilityExceptionSpecification.byCertCodes(certCodes))
                                .and(EmployeeEligibilityExceptionSpecification.byLevels(levels))
                                .and(EmployeeEligibilityExceptionSpecification.bySubCodes(subCodes))
                                .and(EmployeeEligibilityExceptionSpecification.byStatus(status))
                                .and(EmployeeEligibilityExceptionSpecification.bySearch(search))
                                .and((root, query, cb) -> {
                                        var emp = root.join("employee", JoinType.INNER);
                                        return cb.and(
                                                        cb.isNull(emp.get("deletedAt")),
                                                        cb.or(
                                                                        cb.isNull(emp.get("status")),
                                                                        cb.notEqual(cb.lower(emp.get("status")),
                                                                                        cb.literal("resign"))));
                                });

                if (pageable.getSort().isUnsorted()) {
                        pageable = PageRequest.of(
                                        pageable.getPageNumber(),
                                        pageable.getPageSize(),
                                        Sort.by(
                                                        Sort.Order.asc("employee.jobPosition.name"),
                                                        Sort.Order.asc("certificationRule.certification.code"),
                                                        Sort.Order.asc("certificationRule.certificationLevel.level"),
                                                        Sort.Order.asc("certificationRule.subField.code")));
                }

                return exceptionRepo.findAll(spec, pageable).map(this::toResponse);
        }

        @Transactional(readOnly = true)
        public List<EmployeeEligibilityExceptionResponse> getByEmployee(Long employeeId) {
                Employee emp = employeeRepo.findById(employeeId)
                                .orElseThrow(() -> new RuntimeException("Employee not found"));
                if (isResigned(emp))
                        return List.of();

                return exceptionRepo.findByEmployeeIdAndDeletedAtIsNull(employeeId)
                                .stream().map(this::toResponse).toList();
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse create(Long employeeId, Long certificationRuleId, String notes) {
                Employee employee = employeeRepo.findById(employeeId)
                                .orElseThrow(() -> new RuntimeException("Employee not found"));
                if (isResigned(employee)) {
                        throw new RuntimeException("Tidak bisa membuat exception untuk pegawai RESIGN/non-aktif");
                }

                CertificationRule rule = ruleRepo.findById(certificationRuleId)
                                .orElseThrow(() -> new RuntimeException("Certification rule not found"));

                exceptionRepo.findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(employeeId,
                                certificationRuleId)
                                .ifPresent(e -> {
                                        throw new RuntimeException("Exception already exists and active");
                                });

                EmployeeEligibilityException softDeleted = exceptionRepo
                                .findFirstByEmployeeIdAndCertificationRuleId(employeeId, certificationRuleId)
                                .orElse(null);

                EmployeeEligibilityException saved;
                if (softDeleted != null && softDeleted.getDeletedAt() != null) {
                        softDeleted.setDeletedAt(null);
                        softDeleted.setIsActive(true);
                        softDeleted.setNotes(notes);
                        softDeleted.setUpdatedAt(Instant.now());
                        saved = exceptionRepo.save(softDeleted);
                } else {
                        EmployeeEligibilityException exception = EmployeeEligibilityException.builder()
                                        .employee(employee)
                                        .certificationRule(rule)
                                        .isActive(true)
                                        .notes(notes)
                                        .createdAt(Instant.now())
                                        .updatedAt(Instant.now())
                                        .build();
                        saved = exceptionRepo.save(exception);
                }

                eligibilityService.refreshEligibilityForEmployee(employeeId); // auto refresh setelah exception berubah
                return toResponse(saved);
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse updateNotes(Long id, String notes) {
                EmployeeEligibilityException exception = exceptionRepo.findById(id)
                                .orElseThrow(() -> new RuntimeException("Exception not found"));
                exception.setNotes(notes);
                exception.setUpdatedAt(Instant.now());
                return toResponse(exceptionRepo.save(exception));
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse toggleActive(Long id) {
                EmployeeEligibilityException exception = exceptionRepo.findById(id)
                                .orElseThrow(() -> new RuntimeException("Exception not found"));

                if (!Boolean.TRUE.equals(exception.getIsActive())) {
                        var emp = exception.getEmployee();
                        if (isResigned(emp)) {
                                throw new RuntimeException(
                                                "Tidak bisa mengaktifkan exception untuk pegawai RESIGN/non-aktif");
                        }
                }

                exception.setIsActive(!Boolean.TRUE.equals(exception.getIsActive()));
                exception.setUpdatedAt(Instant.now());

                EmployeeEligibilityException saved = exceptionRepo.save(exception);
                eligibilityService.refreshEligibilityForEmployee(saved.getEmployee().getId()); // auto refresh setelah
                                                                                               // exception berubah
                return toResponse(saved);
        }

        @Transactional
        public void softDelete(Long id) {
                EmployeeEligibilityException exception = exceptionRepo.findById(id)
                                .orElseThrow(() -> new RuntimeException("Exception not found"));
                exception.setIsActive(false);
                exception.setDeletedAt(Instant.now());
                exception.setUpdatedAt(Instant.now());
                EmployeeEligibilityException saved = exceptionRepo.save(exception);

                eligibilityService.refreshEligibilityForEmployee(saved.getEmployee().getId()); // auto refresh setelah
                                                                                               // exception berubah
        }

        private boolean isResigned(Employee e) {
                if (e == null)
                        return true;
                if (e.getDeletedAt() != null)
                        return true;
                String st = e.getStatus();
                return st != null && "RESIGN".equalsIgnoreCase(st.trim());
        }
}
