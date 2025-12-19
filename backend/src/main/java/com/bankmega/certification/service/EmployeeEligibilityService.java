package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeEligibilitySpecification;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class EmployeeEligibilityService {

    private final EmployeeEligibilityRepository eligibilityRepo;
    private final EmployeeCertificationRepository employeeCertificationRepo;
    private final JobCertificationMappingRepository jobCertMappingRepo;
    private final EmployeeEligibilityExceptionRepository exceptionRepo;
    private final EmployeeRepository employeeRepo;

    private EmployeeEligibilityResponse toResponse(EmployeeEligibility e) {
        if (e == null)
            return null;

        CertificationRule rule = e.getCertificationRule();
        Employee emp = e.getEmployee();

        LocalDate wajibPunya = null;
        Integer masaBerlaku = null;
        String sisaWaktu = null;

        if (emp != null && emp.getEffectiveDate() != null && rule != null && rule.getWajibSetelahMasuk() != null) {
            wajibPunya = emp.getEffectiveDate().plusMonths(rule.getWajibSetelahMasuk());
        }
        if (rule != null) {
            masaBerlaku = rule.getValidityMonths();
        }
        if (e.getDueDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), e.getDueDate());
            sisaWaktu = days >= 0 ? days + " hari" : "Kadaluarsa";
        }

        return EmployeeEligibilityResponse.builder()
                .id(e.getId())
                .employeeId(emp != null ? emp.getId() : null)
                .employeeName(emp != null ? emp.getName() : null)
                .nip(emp != null ? emp.getNip() : null)
                .jobPositionTitle(emp != null && emp.getJobPosition() != null ? emp.getJobPosition().getName() : null)
                .effectiveDate(emp != null ? emp.getEffectiveDate() : null)

                .certificationRuleId(rule != null ? rule.getId() : null)
                .certificationCode(rule != null ? rule.getCertification().getCode() : null)
                .certificationName(rule != null ? rule.getCertification().getName() : null)
                .certificationLevelName(rule != null && rule.getCertificationLevel() != null
                        ? rule.getCertificationLevel().getName()
                        : null)
                .certificationLevelLevel(rule != null && rule.getCertificationLevel() != null
                        ? rule.getCertificationLevel().getLevel()
                        : null)
                .subFieldName(rule != null && rule.getSubField() != null ? rule.getSubField().getName() : null)
                .subFieldCode(rule != null && rule.getSubField() != null ? rule.getSubField().getCode() : null)

                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .dueDate(e.getDueDate())
                .source(e.getSource() != null ? e.getSource().name() : null)
                .isActive(e.getIsActive())

                .wajibPunyaSertifikasiSampai(wajibPunya)
                .masaBerlakuBulan(masaBerlaku)
                .sisaWaktu(sisaWaktu)

                .certNumber(e.getCertNumber())
                .certDate(e.getCertDate())

                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .trainingCount(e.getTrainingCount())
                .refreshmentCount(e.getRefreshmentCount())
                .extensionCount(e.getExtensionCount())
                .build();
    }

    @Transactional(readOnly = true)
    public Page<EmployeeEligibilityResponse> getPagedFiltered(
            List<Long> employeeIds,
            List<Long> jobIds,
            List<String> certCodes,
            List<Integer> levels,
            List<String> subCodes,
            List<String> statuses,
            List<String> sources,
            String search,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            List<Long> allowedCertificationIds,
            Pageable pageable) {

        Specification<EmployeeEligibility> spec = EmployeeEligibilitySpecification.notDeleted()
                .and(EmployeeEligibilitySpecification.byEmployeeIds(employeeIds))
                .and(EmployeeEligibilitySpecification.byJobIds(jobIds))
                .and(EmployeeEligibilitySpecification.byCertCodes(certCodes))
                .and(EmployeeEligibilitySpecification.byLevels(levels))
                .and(EmployeeEligibilitySpecification.bySubCodes(subCodes))
                .and(EmployeeEligibilitySpecification.byStatuses(statuses))
                .and(EmployeeEligibilitySpecification.bySources(sources))
                .and(EmployeeEligibilitySpecification.byRegionalId(regionalId))
                .and(EmployeeEligibilitySpecification.byDivisionId(divisionId))
                .and(EmployeeEligibilitySpecification.byUnitId(unitId))
                .and(EmployeeEligibilitySpecification.byCertificationId(certificationId))
                .and(EmployeeEligibilitySpecification.byLevelId(levelId))
                .and(EmployeeEligibilitySpecification.bySubFieldId(subFieldId))
                .and(EmployeeEligibilitySpecification.byAllowedCertificationIds(allowedCertificationIds))
                .and(excludeResignedEmployee());

        if (search != null && !search.isBlank()) {
            spec = spec.and(EmployeeEligibilitySpecification.bySearch(search));
        }

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    Sort.by(
                            Sort.Order.asc("employee.nip"),
                            Sort.Order.asc("certificationRule.certification.code"),
                            Sort.Order.asc("certificationRule.certificationLevel.level"),
                            Sort.Order.asc("certificationRule.subField.code")));
        }

        return eligibilityRepo.findAll(spec, pageable).map(this::toResponse);
    }

    private Specification<EmployeeEligibility> buildDashboardBaseSpec(
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            List<Long> allowedCertificationIds,
            List<Long> employeeIds) {

        return EmployeeEligibilitySpecification.notDeleted()
                .and(EmployeeEligibilitySpecification.byRegionalId(regionalId))
                .and(EmployeeEligibilitySpecification.byDivisionId(divisionId))
                .and(EmployeeEligibilitySpecification.byUnitId(unitId))
                .and(EmployeeEligibilitySpecification.byCertificationId(certificationId))
                .and(EmployeeEligibilitySpecification.byLevelId(levelId))
                .and(EmployeeEligibilitySpecification.bySubFieldId(subFieldId))
                .and(EmployeeEligibilitySpecification.byAllowedCertificationIds(allowedCertificationIds))
                .and(EmployeeEligibilitySpecification.byEmployeeIds(employeeIds))
                .and(excludeResignedEmployee());
    }

    private Specification<EmployeeEligibility> excludeResignedEmployee() {
        return (root, query, cb) -> {
            var emp = root.join("employee", JoinType.INNER);
            return cb.and(
                    cb.isNull(emp.get("deletedAt")),
                    cb.or(
                            cb.isNull(emp.get("status")),
                            cb.notEqual(cb.lower(emp.get("status")), cb.literal("resign"))));
        };
    }

    @Transactional(readOnly = true)
    public long countForDashboard(
            List<String> statuses,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            List<Long> allowedCertificationIds,
            List<Long> employeeIds) {

        Specification<EmployeeEligibility> spec = buildDashboardBaseSpec(
                regionalId, divisionId, unitId, certificationId, levelId, subFieldId, allowedCertificationIds,
                employeeIds);

        if (statuses != null && !statuses.isEmpty()) {
            spec = spec.and(EmployeeEligibilitySpecification.byStatuses(statuses));
        }

        return eligibilityRepo.count(spec);
    }

    @Transactional(readOnly = true)
    public List<EmployeeEligibilityResponse> getByEmployeeId(Long employeeId) {
        Employee emp = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));
        if (isResigned(emp))
            return List.of();

        return eligibilityRepo.findByEmployee_IdAndDeletedAtIsNull(employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeEligibilityResponse getById(Long id) {
        return eligibilityRepo.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Eligibility not found"));
    }

    @Transactional
    public EmployeeEligibilityResponse toggleActive(Long id) {
        EmployeeEligibility eligibility = eligibilityRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Eligibility not found"));

        eligibility.setIsActive(!Boolean.TRUE.equals(eligibility.getIsActive()));
        eligibility.setDeletedAt(Boolean.TRUE.equals(eligibility.getIsActive()) ? null : Instant.now());

        return toResponse(eligibilityRepo.save(eligibility));
    }

    @Transactional
    public void softDelete(Long id) {
        EmployeeEligibility eligibility = eligibilityRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Eligibility not found"));
        eligibility.setIsActive(false);
        eligibility.setDeletedAt(Instant.now());
        eligibilityRepo.save(eligibility);
    }

    @Transactional
    public int refreshEligibility() {
        List<Employee> employees = employeeRepo.findAll();
        if (employees.isEmpty())
            return 0;

        List<Employee> activeEmployees = employees.stream().filter(e -> !isResigned(e)).toList();
        List<Employee> resignedEmployees = employees.stream().filter(this::isResigned).toList();

        Set<Long> allEmployeeIds = employees.stream().map(Employee::getId).collect(Collectors.toSet());

        Map<Long, List<EmployeeEligibility>> eligByEmployeeId = eligibilityRepo
                .findByEmployeeIdIn(allEmployeeIds).stream()
                .collect(Collectors.groupingBy(ee -> ee.getEmployee().getId()));

        Map<Long, List<CertificationRule>> jobRuleMap = jobCertMappingRepo.findAll().stream()
                .filter(j -> j.getDeletedAt() == null)
                .collect(Collectors.groupingBy(
                        j -> j.getJobPosition().getId(),
                        Collectors.mapping(JobCertificationMapping::getCertificationRule, Collectors.toList())));

        Map<Long, List<CertificationRule>> exceptionRuleMap = exceptionRepo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && Boolean.TRUE.equals(e.getIsActive()))
                .collect(Collectors.groupingBy(
                        e -> e.getEmployee().getId(),
                        Collectors.mapping(EmployeeEligibilityException::getCertificationRule, Collectors.toList())));

        List<EmployeeEligibility> allToSave = new ArrayList<>();

        for (Employee emp : resignedEmployees) {
            List<EmployeeEligibility> existing = eligByEmployeeId.getOrDefault(emp.getId(), List.of());
            allToSave.addAll(deactivateEligibilitiesForEmployee(emp, existing));
        }

        for (Employee employee : activeEmployees) {
            List<EmployeeEligibility> existing = eligByEmployeeId.getOrDefault(employee.getId(), List.of());
            allToSave.addAll(syncEligibilitiesForEmployee(employee, existing, jobRuleMap, exceptionRuleMap));
        }

        if (!allToSave.isEmpty()) {
            eligibilityRepo.saveAll(allToSave);
        }

        if (!activeEmployees.isEmpty()) {
            syncWithCertifications(activeEmployees);
        }

        return allToSave.size();
    }

    @Transactional
    public void refreshEligibilityForEmployee(Long employeeId) {
        Employee employee = employeeRepo.findById(employeeId)
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        if (isResigned(employee)) {
            List<EmployeeEligibility> deactivated = deactivateEligibilitiesForEmployee(employee);
            if (!deactivated.isEmpty())
                eligibilityRepo.saveAll(deactivated);
            return;
        }

        Map<Long, List<CertificationRule>> jobRuleMap = jobCertMappingRepo.findAll().stream()
                .filter(j -> j.getDeletedAt() == null)
                .collect(Collectors.groupingBy(
                        j -> j.getJobPosition().getId(),
                        Collectors.mapping(JobCertificationMapping::getCertificationRule, Collectors.toList())));

        Map<Long, List<CertificationRule>> exceptionRuleMap = exceptionRepo.findAll().stream()
                .filter(e -> e.getDeletedAt() == null && Boolean.TRUE.equals(e.getIsActive()))
                .collect(Collectors.groupingBy(
                        e -> e.getEmployee().getId(),
                        Collectors.mapping(EmployeeEligibilityException::getCertificationRule, Collectors.toList())));

        List<EmployeeEligibility> existingElig = eligibilityRepo.findByEmployeeId(employeeId);

        List<EmployeeEligibility> toSave = syncEligibilitiesForEmployee(employee, existingElig, jobRuleMap,
                exceptionRuleMap);

        if (!toSave.isEmpty()) {
            eligibilityRepo.saveAll(toSave);
        }

        syncWithCertifications(List.of(employee));
    }

    private boolean isResigned(Employee e) {
        if (e == null)
            return true;
        if (e.getDeletedAt() != null)
            return true;
        String st = e.getStatus();
        return st != null && "RESIGN".equalsIgnoreCase(st.trim());
    }

    private List<EmployeeEligibility> deactivateEligibilitiesForEmployee(Employee employee) {
        List<EmployeeEligibility> existing = eligibilityRepo.findByEmployeeAndDeletedAtIsNull(employee);
        if (existing.isEmpty())
            return existing;

        Instant now = Instant.now();
        for (EmployeeEligibility ee : existing) {
            ee.setIsActive(false);
            ee.setDeletedAt(now);
        }
        return existing;
    }

    private List<EmployeeEligibility> deactivateEligibilitiesForEmployee(
            Employee employee,
            List<EmployeeEligibility> existing) {

        if (existing == null || existing.isEmpty())
            return List.of();

        Instant now = Instant.now();
        List<EmployeeEligibility> changed = new ArrayList<>();
        for (EmployeeEligibility ee : existing) {
            if (ee.getDeletedAt() != null)
                continue;
            ee.setIsActive(false);
            ee.setDeletedAt(now);
            changed.add(ee);
        }
        return changed;
    }

    private List<EmployeeEligibility> syncEligibilitiesForEmployee(
            Employee employee,
            List<EmployeeEligibility> existingElig,
            Map<Long, List<CertificationRule>> jobRuleMap,
            Map<Long, List<CertificationRule>> exceptionRuleMap) {

        if (isResigned(employee)) {
            return deactivateEligibilitiesForEmployee(employee, existingElig);
        }

        if (existingElig == null)
            existingElig = List.of();

        Long jobId = employee.getJobPosition() != null ? employee.getJobPosition().getId() : null;
        List<CertificationRule> mappingRules = jobId != null ? jobRuleMap.getOrDefault(jobId, List.of()) : List.of();
        List<CertificationRule> manualRules = exceptionRuleMap.getOrDefault(employee.getId(), List.of());

        Set<Long> jobRuleIds = mappingRules.stream().map(CertificationRule::getId).collect(Collectors.toSet());
        Set<Long> manualRuleIds = manualRules.stream().map(CertificationRule::getId).collect(Collectors.toSet());

        Set<Long> requiredIds = new HashSet<>();
        requiredIds.addAll(jobRuleIds);
        requiredIds.addAll(manualRuleIds);

        List<EmployeeEligibility> toSave = new ArrayList<>();
        Instant now = Instant.now();

        for (EmployeeEligibility ee : existingElig) {
            if (ee.getDeletedAt() != null)
                continue;
            Long ruleId = ee.getCertificationRule() != null ? ee.getCertificationRule().getId() : null;

            if (ruleId == null || !requiredIds.contains(ruleId)) {
                if (ee.getStatus() != null
                        && ee.getStatus() != EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED) {
                    continue;
                }
                ee.setIsActive(false);
                ee.setDeletedAt(now);
                toSave.add(ee);
            }
        }

        Map<Long, EmployeeEligibility> existingByRuleId = existingElig.stream()
                .filter(ee -> ee.getCertificationRule() != null)
                .collect(Collectors.toMap(
                        ee -> ee.getCertificationRule().getId(),
                        ee -> ee,
                        (e1, e2) -> e1));

        for (Long ruleId : requiredIds) {
            CertificationRule rule = Stream.concat(manualRules.stream(), mappingRules.stream())
                    .filter(r -> r.getId().equals(ruleId))
                    .findFirst()
                    .orElse(null);
            if (rule == null)
                continue;

            EmployeeEligibility eligibility = existingByRuleId.get(ruleId);
            if (eligibility == null) {
                eligibility = new EmployeeEligibility();
                eligibility.setEmployee(employee);
                eligibility.setCertificationRule(rule);
            } else {
                eligibility.setEmployee(employee);
                eligibility.setCertificationRule(rule);
            }

            boolean fromJob = jobRuleIds.contains(ruleId);
            boolean fromName = manualRuleIds.contains(ruleId);

            if (fromJob)
                eligibility.setSource(EmployeeEligibility.EligibilitySource.BY_JOB);
            else if (fromName)
                eligibility.setSource(EmployeeEligibility.EligibilitySource.BY_NAME);
            else
                eligibility.setSource(null);

            if (eligibility.getStatus() == null) {
                eligibility.setStatus(EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED);
            }

            eligibility.setIsActive(true);
            eligibility.setDeletedAt(null);
            eligibility.setValidityMonths(rule.getValidityMonths());
            eligibility.setReminderMonths(rule.getReminderMonths());
            eligibility.setWajibSetelahMasuk(rule.getWajibSetelahMasuk());

            toSave.add(eligibility);
        }

        return toSave;
    }

    private void syncWithCertifications(List<Employee> employees) {
        if (employees == null || employees.isEmpty())
            return;

        List<Long> employeeIds = employees.stream().map(Employee::getId).toList();
        List<EmployeeCertification> certs = employeeCertificationRepo.findByEmployeeIdInAndDeletedAtIsNull(employeeIds);

        Map<String, EmployeeCertification> latestCerts = certs.stream()
                .collect(Collectors.toMap(
                        c -> c.getEmployee().getId() + "-" + c.getCertificationRule().getId(),
                        c -> c,
                        (c1, c2) -> {
                            LocalDate d1 = c1.getCertDate();
                            LocalDate d2 = c2.getCertDate();
                            if (d1 == null && d2 == null)
                                return c2;
                            if (d1 == null)
                                return c2;
                            if (d2 == null)
                                return c1;
                            return d1.isAfter(d2) ? c1 : c2;
                        }));

        List<EmployeeEligibility> allEligibilities = eligibilityRepo
                .findByEmployeeIdInAndDeletedAtIsNull(new HashSet<>(employeeIds));

        LocalDate today = LocalDate.now();
        List<EmployeeEligibility> changed = new ArrayList<>();

        for (EmployeeEligibility ee : allEligibilities) {
            String key = ee.getEmployee().getId() + "-" + ee.getCertificationRule().getId();
            EmployeeCertification cert = latestCerts.get(key);

            EmployeeEligibility.EligibilityStatus beforeStatus = ee.getStatus();
            LocalDate beforeDue = ee.getDueDate();
            String beforeCertNumber = ee.getCertNumber();
            LocalDate beforeCertDate = ee.getCertDate();

            if (cert != null) {
                ee.setCertNumber(cert.getCertNumber());
                ee.setCertDate(cert.getCertDate());

                ee.setDueDate(cert.getValidUntil());
                if (cert.getValidUntil() == null) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED);
                } else if (today.isAfter(cert.getValidUntil())) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.EXPIRED);
                } else if (cert.getReminderDate() != null && !today.isBefore(cert.getReminderDate())) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.DUE);
                } else {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.ACTIVE);
                }
            } else {
                ee.setCertNumber(null);
                ee.setCertDate(null);

                ee.setStatus(EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED);
                ee.setDueDate(null);
            }

            if (!Objects.equals(beforeStatus, ee.getStatus())
                    || !Objects.equals(beforeDue, ee.getDueDate())
                    || !Objects.equals(beforeCertNumber, ee.getCertNumber())
                    || !Objects.equals(beforeCertDate, ee.getCertDate())) {
                changed.add(ee);
            }
        }

        if (!changed.isEmpty()) {
            eligibilityRepo.saveAll(changed);
        }
    }
}
