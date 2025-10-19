package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeCertification;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

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

        List<EmployeeCertification> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

        Optional<EmployeeCertification> findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(
                        Long employeeId, Long certificationRuleId);

        List<EmployeeCertification> findAllByStatus(EmployeeCertification.Status status);

        // 🔹 Ambil semua sertifikasi yang perlu dikirim reminder hari ini

        @EntityGraph(attributePaths = {
                        "employee",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField"
        })
        List<EmployeeCertification> findByReminderDateAndDeletedAtIsNull(LocalDate reminderDate);

        // 🔹 Ambil sertifikasi expired
        List<EmployeeCertification> findByStatusAndValidUntilBeforeAndDeletedAtIsNull(
                        EmployeeCertification.Status status,
                        LocalDate date);
}
