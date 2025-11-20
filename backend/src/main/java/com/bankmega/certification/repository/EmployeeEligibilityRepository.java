// src/main/java/com/bankmega/certification/repository/EmployeeEligibilityRepository.java
package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeEligibility;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.CertificationRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeEligibilityRepository
                extends JpaRepository<EmployeeEligibility, Long>, JpaSpecificationExecutor<EmployeeEligibility> {

        Optional<EmployeeEligibility> findByEmployeeAndCertificationRuleAndSource(
                        Employee employee, CertificationRule rule, EmployeeEligibility.EligibilitySource source);

        List<EmployeeEligibility> findByCertificationRule_IdAndIsActiveTrueAndDeletedAtIsNull(Long certRuleId);

        List<EmployeeEligibility> findByEmployeeAndDeletedAtIsNull(Employee employee);

        List<EmployeeEligibility> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

        List<EmployeeEligibility> findByEmployeeIdInAndDeletedAtIsNull(Set<Long> employeeIds);

        List<EmployeeEligibility> findByCertificationRuleAndDeletedAtIsNull(CertificationRule rule);

        List<EmployeeEligibility> findByCertificationRuleIdAndDeletedAtIsNull(Long ruleId);

        List<EmployeeEligibility> findByIsActiveTrueAndDeletedAtIsNull();

        List<EmployeeEligibility> findByIsActiveFalseAndDeletedAtIsNull();

        List<EmployeeEligibility> findByDeletedAtIsNull();

        List<EmployeeEligibility> findByEmployee_IdAndDeletedAtIsNull(Long employeeId);

        // ✅ NEW: single row by employee & rule (not deleted)
        Optional<EmployeeEligibility> findByEmployee_IdAndCertificationRule_IdAndDeletedAtIsNull(Long employeeId,
                        Long ruleId);

        List<EmployeeEligibility> findByEmployee_IdInAndCertificationRule_IdAndDeletedAtIsNull(List<Long> employeeIds,
                        Long ruleId);
}
