package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeEligibilityException;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeEligibilityExceptionRepository
                extends JpaRepository<EmployeeEligibilityException, Long>,
                JpaSpecificationExecutor<EmployeeEligibilityException> {

        Optional<EmployeeEligibilityException> findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(
                        Long employeeId, Long certificationRuleId);

        List<EmployeeEligibilityException> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

        List<EmployeeEligibilityException> findByCertificationRuleIdAndDeletedAtIsNull(Long ruleId);

        List<EmployeeEligibilityException> findByDeletedAtIsNull();

        @EntityGraph(attributePaths = { "employee", "certificationRule" })
        List<EmployeeEligibilityException> findWithRelationsByDeletedAtIsNullAndIsActiveTrue();

        // Optimized: Query exceptions for specific employees with relations
        @EntityGraph(attributePaths = { "employee", "certificationRule" })
        List<EmployeeEligibilityException> findWithRelationsByEmployeeIdInAndIsActiveTrueAndDeletedAtIsNull(
                        Set<Long> employeeIds);

        Optional<EmployeeEligibilityException> findFirstByEmployeeIdAndCertificationRuleId(
                        Long employeeId, Long certificationRuleId);
}