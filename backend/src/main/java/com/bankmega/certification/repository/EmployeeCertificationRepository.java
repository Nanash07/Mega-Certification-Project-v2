package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeCertification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeCertificationRepository extends
                JpaRepository<EmployeeCertification, Long>,
                JpaSpecificationExecutor<EmployeeCertification> {

        Optional<EmployeeCertification> findByIdAndDeletedAtIsNull(Long id);

        Optional<EmployeeCertification> findTopByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNullOrderByValidUntilDesc(
                        Long employeeId, Long certificationRuleId);

        List<EmployeeCertification> findByEmployeeIdInAndDeletedAtIsNull(List<Long> employeeIds);

        @EntityGraph(attributePaths = { "employee", "certificationRule" })
        List<EmployeeCertification> findWithRelationsByEmployeeIdInAndDeletedAtIsNull(List<Long> employeeIds);

        List<EmployeeCertification> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

        Optional<EmployeeCertification> findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(
                        Long employeeId, Long certificationRuleId);

        List<EmployeeCertification> findAllByStatus(EmployeeCertification.Status status);

        // Ambil semua sertifikasi yang perlu dikirim reminder hari ini
        @EntityGraph(attributePaths = {
                        "employee",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField"
        })
        List<EmployeeCertification> findByReminderDateAndDeletedAtIsNull(LocalDate reminderDate);

        // EXP: sertifikat yang sudah kadaluarsa SAMPAI HARI INI (<= today) + eager
        // fetch
        @EntityGraph(attributePaths = {
                        "employee",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField"
        })
        List<EmployeeCertification> findByValidUntilLessThanEqualAndDeletedAtIsNull(LocalDate date);

        // EntityGraph overrides for paging and export
        @Override
        @EntityGraph(attributePaths = {
                        "employee",
                        "employee.positions",
                        "employee.positions.jobPosition",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField",
                        "institution"
        })
        @NonNull
        Page<EmployeeCertification> findAll(@Nullable Specification<EmployeeCertification> spec,
                        @NonNull Pageable pageable);

        @Override
        @EntityGraph(attributePaths = {
                        "employee",
                        "employee.positions",
                        "employee.positions.jobPosition",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField",
                        "institution"
        })
        @NonNull
        List<EmployeeCertification> findAll(@Nullable Specification<EmployeeCertification> spec, @NonNull Sort sort);
}
