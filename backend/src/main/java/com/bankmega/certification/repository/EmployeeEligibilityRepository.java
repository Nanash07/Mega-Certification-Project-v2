package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeeEligibility;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.CertificationRule;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeEligibilityRepository
                extends JpaRepository<EmployeeEligibility, Long>, JpaSpecificationExecutor<EmployeeEligibility> {

        Optional<EmployeeEligibility> findByEmployeeAndCertificationRuleAndSource(
                        Employee employee, CertificationRule rule, EmployeeEligibility.EligibilitySource source);

        List<EmployeeEligibility> findByCertificationRule_IdAndIsActiveTrueAndDeletedAtIsNull(Long certRuleId);

        @EntityGraph(attributePaths = { "employee", "employee.positions", "employee.positions.jobPosition",
                        "certificationRule",
                        "certificationRule.certification" })
        List<EmployeeEligibility> findWithRelationsByCertificationRule_IdAndIsActiveTrueAndDeletedAtIsNull(
                        Long certRuleId);

        List<EmployeeEligibility> findByEmployeeAndDeletedAtIsNull(Employee employee);

        List<EmployeeEligibility> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

        List<EmployeeEligibility> findByEmployeeIdInAndDeletedAtIsNull(Set<Long> employeeIds);

        List<EmployeeEligibility> findByCertificationRuleAndDeletedAtIsNull(CertificationRule rule);

        List<EmployeeEligibility> findByCertificationRuleIdAndDeletedAtIsNull(Long ruleId);

        List<EmployeeEligibility> findByIsActiveTrueAndDeletedAtIsNull();

        List<EmployeeEligibility> findByIsActiveFalseAndDeletedAtIsNull();

        List<EmployeeEligibility> findByDeletedAtIsNull();

        List<EmployeeEligibility> findByEmployee_IdAndDeletedAtIsNull(Long employeeId);

        Optional<EmployeeEligibility> findByEmployee_IdAndCertificationRule_IdAndDeletedAtIsNull(Long employeeId,
                        Long ruleId);

        List<EmployeeEligibility> findByEmployee_IdInAndCertificationRule_IdAndDeletedAtIsNull(List<Long> employeeIds,
                        Long ruleId);

        List<EmployeeEligibility> findByEmployeeIdIn(Set<Long> employeeIds);

        @EntityGraph(attributePaths = { "employee", "certificationRule" })
        List<EmployeeEligibility> findWithRelationsByEmployeeIdIn(Set<Long> employeeIds);

        List<EmployeeEligibility> findByEmployeeId(Long employeeId);

        // EntityGraph overrides for paging and export
        @Override
        @EntityGraph(attributePaths = {
                        "employee",
                        "employee.positions",
                        "employee.positions.jobPosition",
                        "employee.positions.regional",
                        "employee.positions.division",
                        "employee.positions.unit",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField"
        })
        @NonNull
        Page<EmployeeEligibility> findAll(@Nullable Specification<EmployeeEligibility> spec,
                        @NonNull Pageable pageable);

        @Override
        @EntityGraph(attributePaths = {
                        "employee",
                        "employee.positions",
                        "employee.positions.jobPosition",
                        "employee.positions.regional",
                        "employee.positions.division",
                        "employee.positions.unit",
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField"
        })
        @NonNull
        List<EmployeeEligibility> findAll(@Nullable Specification<EmployeeEligibility> spec, @NonNull Sort sort);
}
