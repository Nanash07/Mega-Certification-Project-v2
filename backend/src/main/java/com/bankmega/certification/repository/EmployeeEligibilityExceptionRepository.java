package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeEligibilityException;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

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

        Optional<EmployeeEligibilityException> findFirstByEmployeeIdAndCertificationRuleId(
                        Long employeeId, Long certificationRuleId);
}