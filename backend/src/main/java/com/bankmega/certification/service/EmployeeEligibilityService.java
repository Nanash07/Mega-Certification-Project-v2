package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeEligibilitySpecification;
import jakarta.persistence.criteria.JoinType;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
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

        EmployeePosition primary = emp != null ? emp.getPrimaryPosition() : null;
        LocalDate effDate = primary != null ? primary.getEffectiveDate() : null;
        String jobTitle = primary != null && primary.getJobPosition() != null
                ? primary.getJobPosition().getName()
                : null;

        if (effDate != null && rule != null && rule.getWajibSetelahMasuk() != null) {
            wajibPunya = effDate.plusMonths(rule.getWajibSetelahMasuk());
        }
        if (rule != null) {
            masaBerlaku = rule.getValidityMonths();
        }
        if (e.getDueDate() != null) {
            long days = ChronoUnit.DAYS.between(LocalDate.now(), e.getDueDate());
            sisaWaktu = days >= 0 ? days + " hari" : "Kadaluarsa";
        }

        // Determine display level: owned level if available, otherwise required level
        Integer displayLevel = e.getOwnedLevel() != null ? e.getOwnedLevel()
                : (rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getLevel()
                        : null);
        String displayLevelName = e.getOwnedLevelName() != null ? e.getOwnedLevelName()
                : (rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getName()
                        : null);

        return EmployeeEligibilityResponse.builder()
                .id(e.getId())
                .employeeId(emp != null ? emp.getId() : null)
                .employeeName(emp != null ? emp.getName() : null)
                .nip(emp != null ? emp.getNip() : null)
                .jobPositionTitle(jobTitle)
                .effectiveDate(effDate)

                .certificationRuleId(rule != null ? rule.getId() : null)
                .certificationCode(rule != null ? rule.getCertification().getCode() : null)
                .certificationName(rule != null ? rule.getCertification().getName() : null)
                .certificationLevelName(displayLevelName)
                .certificationLevelLevel(displayLevel)
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

                // Cover-down fields
                .isCoveredByHigherLevel(e.getIsCoveredByHigherLevel())
                .ownedLevel(e.getOwnedLevel())
                .ownedLevelName(e.getOwnedLevelName())
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

        Specification<EmployeeEligibility> spec = buildFilteredSpec(
                employeeIds, jobIds, certCodes, levels, subCodes,
                statuses, sources, search,
                regionalId, divisionId, unitId, certificationId, levelId, subFieldId,
                allowedCertificationIds);

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    java.util.Objects.requireNonNull(defaultSort()));
        }

        return eligibilityRepo.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(
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
            List<Long> allowedCertificationIds) {

        Specification<EmployeeEligibility> spec = buildFilteredSpec(
                employeeIds, jobIds, certCodes, levels, subCodes,
                statuses, sources, search,
                regionalId, divisionId, unitId, certificationId, levelId, subFieldId,
                allowedCertificationIds);

        List<EmployeeEligibility> rows = eligibilityRepo.findAll(spec, java.util.Objects.requireNonNull(defaultSort()));
        List<EmployeeEligibilityResponse> data = rows.stream().map(this::toResponse).toList();

        return buildEligibilityExcel(data);
    }

    private Specification<EmployeeEligibility> buildFilteredSpec(
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
            List<Long> allowedCertificationIds) {

        Specification<EmployeeEligibility> spec = EmployeeEligibilitySpecification.notDeleted()
                .and(EmployeeEligibilitySpecification.withFetchJoins())
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

        return spec;
    }

    private Sort defaultSort() {
        return Sort.by(
                Sort.Order.asc("employee.nip"),
                Sort.Order.asc("certificationRule.certification.code"),
                Sort.Order.asc("certificationRule.certificationLevel.level"),
                Sort.Order.asc("certificationRule.subField.code"));
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
        Employee emp = employeeRepo.findById(java.util.Objects.requireNonNull(employeeId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Employee not found"));
        if (isResigned(emp))
            return List.of();

        return eligibilityRepo.findByEmployee_IdAndDeletedAtIsNull(employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public EmployeeEligibilityResponse getById(Long id) {
        return eligibilityRepo.findById(java.util.Objects.requireNonNull(id))
                .map(this::toResponse)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Eligibility not found"));
    }

    @Transactional
    public EmployeeEligibilityResponse toggleActive(Long id) {
        EmployeeEligibility eligibility = eligibilityRepo.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Eligibility not found"));

        eligibility.setIsActive(!Boolean.TRUE.equals(eligibility.getIsActive()));
        eligibility.setDeletedAt(Boolean.TRUE.equals(eligibility.getIsActive()) ? null : Instant.now());

        return toResponse(eligibilityRepo.save(eligibility));
    }

    @Transactional
    public void softDelete(Long id) {
        EmployeeEligibility eligibility = eligibilityRepo.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Eligibility not found"));
        eligibility.setIsActive(false);
        eligibility.setDeletedAt(Instant.now());
        eligibilityRepo.save(eligibility);
    }

    @Transactional
    public int refreshEligibility() {
        // Optimized: Use EntityGraph to load employees with positions in single query
        List<Employee> employees = employeeRepo.findWithRelationsByDeletedAtIsNull();
        if (employees.isEmpty())
            return 0;

        List<Employee> activeEmployees = employees.stream().filter(e -> !isResigned(e)).toList();
        List<Employee> resignedEmployees = employees.stream().filter(this::isResigned).toList();

        Set<Long> allEmployeeIds = employees.stream().map(Employee::getId).collect(Collectors.toSet());

        Map<Long, List<EmployeeEligibility>> eligByEmployeeId = eligibilityRepo
                .findWithRelationsByEmployeeIdIn(allEmployeeIds).stream()
                .collect(Collectors.groupingBy(ee -> ee.getEmployee().getId()));

        Map<Long, List<CertificationRule>> jobRuleMap = jobCertMappingRepo.findWithRelationsByDeletedAtIsNull().stream()
                .collect(Collectors.groupingBy(
                        j -> j.getJobPosition().getId(),
                        Collectors.mapping(JobCertificationMapping::getCertificationRule, Collectors.toList())));

        Map<Long, List<CertificationRule>> exceptionRuleMap = exceptionRepo
                .findWithRelationsByDeletedAtIsNullAndIsActiveTrue().stream()
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
        // Optimized: Use EntityGraph to load employee with positions in single query
        Employee employee = employeeRepo.findByIdWithPositions(java.util.Objects.requireNonNull(employeeId))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Employee not found"));

        if (isResigned(employee)) {
            List<EmployeeEligibility> deactivated = deactivateEligibilitiesForEmployee(employee);
            if (!deactivated.isEmpty())
                eligibilityRepo.saveAll(deactivated);
            return;
        }

        Map<Long, List<CertificationRule>> jobRuleMap = jobCertMappingRepo.findWithRelationsByDeletedAtIsNull().stream()
                .collect(Collectors.groupingBy(
                        j -> j.getJobPosition().getId(),
                        Collectors.mapping(JobCertificationMapping::getCertificationRule, Collectors.toList())));

        Map<Long, List<CertificationRule>> exceptionRuleMap = exceptionRepo
                .findWithRelationsByDeletedAtIsNullAndIsActiveTrue().stream()
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

    @Transactional
    public void refreshEligibilityForJobPosition(Long jobPositionId) {
        if (jobPositionId == null)
            return;

        // Optimized: Use EntityGraph to load employees with positions in single query
        List<Employee> employees = employeeRepo.findWithRelationsByStatusIgnoreCaseNotAndDeletedAtIsNull("RESIGN")
                .stream()
                .filter(e -> {
                    EmployeePosition primary = e.getPrimaryPosition();
                    EmployeePosition secondary = e.getSecondaryPosition();
                    boolean matchPrimary = primary != null
                            && primary.getJobPosition() != null
                            && Objects.equals(primary.getJobPosition().getId(), jobPositionId);
                    boolean matchSecondary = secondary != null
                            && secondary.getJobPosition() != null
                            && Objects.equals(secondary.getJobPosition().getId(), jobPositionId);
                    return matchPrimary || matchSecondary;
                })
                .toList();

        if (employees.isEmpty())
            return;

        // Refresh eligibility for each employee
        Map<Long, List<CertificationRule>> jobRuleMap = jobCertMappingRepo.findWithRelationsByDeletedAtIsNull().stream()
                .collect(Collectors.groupingBy(
                        j -> j.getJobPosition().getId(),
                        Collectors.mapping(JobCertificationMapping::getCertificationRule, Collectors.toList())));

        Map<Long, List<CertificationRule>> exceptionRuleMap = exceptionRepo
                .findWithRelationsByDeletedAtIsNullAndIsActiveTrue().stream()
                .collect(Collectors.groupingBy(
                        ex -> ex.getEmployee().getId(),
                        Collectors.mapping(EmployeeEligibilityException::getCertificationRule, Collectors.toList())));

        List<EmployeeEligibility> toSave = new ArrayList<>();
        for (Employee employee : employees) {
            List<EmployeeEligibility> existingElig = eligibilityRepo.findByEmployeeId(employee.getId());
            toSave.addAll(syncEligibilitiesForEmployee(employee, existingElig, jobRuleMap, exceptionRuleMap));
        }

        if (!toSave.isEmpty()) {
            eligibilityRepo.saveAll(toSave);
        }

        syncWithCertifications(employees);
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

    private List<EmployeeEligibility> deactivateEligibilitiesForEmployee(Employee employee,
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

        Set<Long> allJobIds = employee.getAllActiveJobPositions().stream()
                .map(JobPosition::getId)
                .collect(Collectors.toSet());

        List<CertificationRule> mappingRules = allJobIds.stream()
                .flatMap(jid -> jobRuleMap.getOrDefault(jid, List.of()).stream())
                .distinct()
                .toList();
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

        // Group certifications by employee + certification (not rule!) to enable
        // cover-down
        // Key: employeeId-certificationId
        Map<String, List<EmployeeCertification>> certsByEmpAndCert = certs.stream()
                .filter(c -> c.getCertificationRule() != null && c.getCertificationRule().getCertification() != null)
                .collect(Collectors.groupingBy(
                        c -> c.getEmployee().getId() + "-" + c.getCertificationRule().getCertification().getId()));

        List<EmployeeEligibility> allEligibilities = eligibilityRepo
                .findByEmployeeIdInAndDeletedAtIsNull(new HashSet<>(employeeIds));

        LocalDate today = LocalDate.now();
        List<EmployeeEligibility> changed = new ArrayList<>();

        for (EmployeeEligibility ee : allEligibilities) {
            CertificationRule rule = ee.getCertificationRule();
            if (rule == null || rule.getCertification() == null)
                continue;

            Long certificationId = rule.getCertification().getId();
            Integer requiredLevel = rule.getCertificationLevel() != null
                    ? rule.getCertificationLevel().getLevel()
                    : 0;

            // Save before state for change detection
            EmployeeEligibility.EligibilityStatus beforeStatus = ee.getStatus();
            LocalDate beforeDue = ee.getDueDate();
            String beforeCertNumber = ee.getCertNumber();
            LocalDate beforeCertDate = ee.getCertDate();
            Boolean beforeCovered = ee.getIsCoveredByHigherLevel();
            Integer beforeOwnedLevel = ee.getOwnedLevel();

            // Get all certs for this employee + certification
            String certKey = ee.getEmployee().getId() + "-" + certificationId;
            List<EmployeeCertification> candidateCerts = certsByEmpAndCert.getOrDefault(certKey, List.of());

            // Find the best covering cert:
            // - Must have level >= required level
            // - Must be ACTIVE or DUE (not EXPIRED)
            // - Pick the one with highest level
            EmployeeCertification coveringCert = findBestCoveringCert(candidateCerts, requiredLevel, today);

            if (coveringCert != null) {
                // Apply cover-down logic
                CertificationLevel ownedCertLevel = coveringCert.getCertificationRule().getCertificationLevel();
                Integer ownedLevel = ownedCertLevel != null ? ownedCertLevel.getLevel() : requiredLevel;
                String ownedLevelName = ownedCertLevel != null ? ownedCertLevel.getName() : null;

                ee.setCertNumber(coveringCert.getCertNumber());
                ee.setCertDate(coveringCert.getCertDate());
                ee.setDueDate(coveringCert.getValidUntil());
                ee.setCoveredByCertification(coveringCert);
                ee.setIsCoveredByHigherLevel(ownedLevel > requiredLevel);
                ee.setOwnedLevel(ownedLevel);
                ee.setOwnedLevelName(ownedLevelName);

                // Determine status based on the covering cert
                if (coveringCert.getValidUntil() == null) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED);
                } else if (today.isAfter(coveringCert.getValidUntil())) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.EXPIRED);
                } else if (coveringCert.getReminderDate() != null && !today.isBefore(coveringCert.getReminderDate())) {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.DUE);
                } else {
                    ee.setStatus(EmployeeEligibility.EligibilityStatus.ACTIVE);
                }
            } else {
                // No covering cert found
                ee.setCertNumber(null);
                ee.setCertDate(null);
                ee.setDueDate(null);
                ee.setCoveredByCertification(null);
                ee.setIsCoveredByHigherLevel(false);
                ee.setOwnedLevel(null);
                ee.setOwnedLevelName(null);
                ee.setStatus(EmployeeEligibility.EligibilityStatus.NOT_YET_CERTIFIED);
            }

            // Check if anything changed
            if (!Objects.equals(beforeStatus, ee.getStatus())
                    || !Objects.equals(beforeDue, ee.getDueDate())
                    || !Objects.equals(beforeCertNumber, ee.getCertNumber())
                    || !Objects.equals(beforeCertDate, ee.getCertDate())
                    || !Objects.equals(beforeCovered, ee.getIsCoveredByHigherLevel())
                    || !Objects.equals(beforeOwnedLevel, ee.getOwnedLevel())) {
                changed.add(ee);
            }
        }

        if (!changed.isEmpty()) {
            eligibilityRepo.saveAll(changed);
        }
    }

    private EmployeeCertification findBestCoveringCert(List<EmployeeCertification> certs, Integer requiredLevel,
            LocalDate today) {
        return certs.stream()
                .filter(c -> {
                    if (c.getCertificationRule() == null || c.getCertificationRule().getCertificationLevel() == null)
                        return false;
                    Integer certLevel = c.getCertificationRule().getCertificationLevel().getLevel();
                    return certLevel != null && certLevel >= requiredLevel;
                })
                .filter(c -> {
                    // Expired certs cannot cover
                    LocalDate validUntil = c.getValidUntil();
                    if (validUntil == null)
                        return false; // No expiry means not properly certified
                    return !today.isAfter(validUntil); // Must not be expired
                })
                .max(Comparator.comparingInt(c -> c.getCertificationRule().getCertificationLevel().getLevel()))
                .orElse(null);
    }

    private byte[] buildEligibilityExcel(List<EmployeeEligibilityResponse> data) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sh = wb.createSheet("Eligibility");

            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            CellStyle dateStyle = wb.createCellStyle();
            CreationHelper ch = wb.getCreationHelper();
            dateStyle.setDataFormat(ch.createDataFormat().getFormat("dd-mmm-yyyy"));

            String[] headers = new String[] {
                    "NIP", "Nama", "Jabatan",
                    "Kode Sertifikasi", "Nama Sertifikasi", "Level", "Sub Bidang",
                    "No Sertifikat", "Tgl Sertifikasi",
                    "Status", "Due Date", "Sumber",
                    "SK Efektif", "Wajib Punya Sampai", "Masa Berlaku (Bulan)",
                    "Training", "Refreshment", "Perpanjang"
            };

            Row hr = sh.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hr.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int r = 1;
            for (EmployeeEligibilityResponse e : data) {
                Row row = sh.createRow(r++);

                int col = 0;
                row.createCell(col++).setCellValue(nz(e.getNip()));
                row.createCell(col++).setCellValue(nz(e.getEmployeeName()));
                row.createCell(col++).setCellValue(nz(e.getJobPositionTitle()));

                row.createCell(col++).setCellValue(nz(e.getCertificationCode()));
                row.createCell(col++).setCellValue(nz(e.getCertificationName()));
                row.createCell(col++)
                        .setCellValue(e.getCertificationLevelLevel() != null ? e.getCertificationLevelLevel() : 0);
                row.createCell(col++).setCellValue(nz(e.getSubFieldCode()));

                row.createCell(col++).setCellValue(nz(e.getCertNumber()));
                setDateCell(row, col++, e.getCertDate(), dateStyle);

                row.createCell(col++).setCellValue(nz(e.getStatus()));
                setDateCell(row, col++, e.getDueDate(), dateStyle);
                row.createCell(col++).setCellValue(nz(e.getSource()));

                setDateCell(row, col++, e.getEffectiveDate(), dateStyle);
                setDateCell(row, col++, e.getWajibPunyaSertifikasiSampai(), dateStyle);
                row.createCell(col++).setCellValue(e.getMasaBerlakuBulan() != null ? e.getMasaBerlakuBulan() : 0);

                row.createCell(col++).setCellValue(e.getTrainingCount() != null ? e.getTrainingCount() : 0);
                row.createCell(col++).setCellValue(e.getRefreshmentCount() != null ? e.getRefreshmentCount() : 0);
                row.createCell(col++).setCellValue(e.getExtensionCount() != null ? e.getExtensionCount() : 0);
            }

            for (int i = 0; i < headers.length; i++) {
                sh.autoSizeColumn(i);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to export excel", ex);
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static void setDateCell(Row row, int col, LocalDate date, CellStyle dateStyle) {
        Cell c = row.createCell(col);
        if (date == null)
            return;
        c.setCellValue(java.sql.Date.valueOf(date));
        c.setCellStyle(dateStyle);
    }
}