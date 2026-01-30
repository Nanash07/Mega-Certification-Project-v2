package com.bankmega.certification.service.employee_import;

import com.bankmega.certification.dto.EmployeeImportResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.service.EmployeeCertificationService;
import com.bankmega.certification.service.EmployeeHistoryService;
import com.bankmega.certification.service.UserService;
import jakarta.annotation.PostConstruct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeImportProcessor {

    private final RegionalRepository regionalRepo;
    private final DivisionRepository divisionRepo;
    private final UnitRepository unitRepo;
    private final JobPositionRepository jobRepo;
    private final EmployeeRepository empRepo;
    private final EmployeePositionRepository positionRepo;
    private final EmployeeImportLogRepository logRepo;

    private final EmployeeHistoryService historyService;
    private final EmployeeCertificationService certificationService;
    private final UserService userService;
    private final RoleRepository roleRepo;

    @PersistenceContext
    private EntityManager em;

    private final Map<String, Regional> regionalCache = new ConcurrentHashMap<>();
    private final Map<String, Division> divisionCache = new ConcurrentHashMap<>();
    private final Map<String, Unit> unitCache = new ConcurrentHashMap<>();
    private final Map<String, JobPosition> jobCache = new ConcurrentHashMap<>();

    private Role pegawaiRole;

    private static final int BATCH_SIZE = 500;

    @PostConstruct
    public void initRole() {
        pegawaiRole = roleRepo.findByNameIgnoreCase("Pegawai")
                .orElseGet(() -> roleRepo.save(Objects.requireNonNull(
                        Role.builder()
                                .name("Pegawai")
                                .createdAt(Instant.now())
                                .updatedAt(Instant.now())
                                .build())));
    }

    @Transactional(readOnly = true)
    public EmployeeImportResponse dryRun(MultipartFile file, User user) throws Exception {
        preloadMasters();
        ImportPlan plan = buildPlan(file, true, true);
        EmployeeImportResponse res = plan.toResponse(file.getOriginalFilename(), true);
        res.setMessage("Dry run selesai oleh " + user.getUsername());
        return res;
    }

    @Transactional
    public EmployeeImportResponse confirm(MultipartFile file, User user) throws Exception {
        preloadMasters();
        ImportPlan plan = buildPlan(file, false, true);

        batchSave(plan.newEmployees, empRepo::saveAll);
        batchSave(plan.rehiredEmployees, empRepo::saveAll);
        batchSave(plan.updatedEmployees, empRepo::saveAll);
        batchSave(plan.mutatedEmployees, empRepo::saveAll);
        batchSave(plan.resignedEmployees, empRepo::saveAll);

        historyService.flushBatch();

        runAfterCommit(() -> {
            if (!plan.createdOrRehiredForAccount.isEmpty()) {
                List<String> upsertNips = plan.createdOrRehiredForAccount.stream()
                        .map(Employee::getNip)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();
                safe(() -> userService.batchUpsertAccountsByNips(upsertNips, pegawaiRole));
            }

            if (!plan.resignedEmployees.isEmpty()) {
                List<Long> resignedIds = plan.resignedEmployees.stream()
                        .map(Employee::getId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();
                safe(() -> userService.batchDeactivateByEmployeeIds(resignedIds));
                safe(() -> certificationService.bulkInvalidateByEmployeeIds(resignedIds));
            }

            if (!plan.rehiredEmployees.isEmpty()) {
                List<Long> rehiredIds = plan.rehiredEmployees.stream()
                        .map(Employee::getId)
                        .filter(Objects::nonNull)
                        .distinct()
                        .toList();
                safe(() -> certificationService.markInvalidToPendingForEmployeeIds(rehiredIds));
                safe(() -> certificationService.recomputeStatusesForEmployeeIds(rehiredIds));
            }
        });

        saveImportLog(user, file, plan);

        EmployeeImportResponse res = plan.toResponse(file.getOriginalFilename(), false);
        res.setMessage("Import pegawai berhasil oleh " + user.getUsername());
        return res;
    }

    public void preloadMasters() {
        if (regionalCache.isEmpty())
            regionalRepo.findAll().forEach(r -> regionalCache.put(norm(r.getName()), r));
        if (divisionCache.isEmpty())
            divisionRepo.findAll().forEach(d -> divisionCache.put(norm(d.getName()), d));
        if (unitCache.isEmpty())
            unitRepo.findAll().forEach(u -> unitCache.put(norm(u.getName()), u));
        if (jobCache.isEmpty())
            jobRepo.findAll().forEach(j -> jobCache.put(norm(j.getName()), j));
    }

    private ImportPlan buildPlan(MultipartFile file, boolean dryRun, boolean strictGuard) throws Exception {
        List<ImportRow> rows = parseExcel(file);
        ImportPlan plan = new ImportPlan();
        if (rows.isEmpty())
            return plan;

        if (strictGuard) {
            // Optimized: Use count query instead of loading all entities
            long activeNow = empRepo.countByDeletedAtIsNull();
            if (!dryRun && rows.size() < Math.max(50, (int) (activeNow * 0.6))) {
                throw new IllegalStateException("Import terdeteksi bukan full snapshot ("
                        + rows.size() + " < 60% dari aktif: " + activeNow + "). "
                        + "Batalkan untuk mencegah mass-resign.");
            }
        }

        plan.processed = rows.size();

        Map<String, List<Integer>> dupMap = new HashMap<>();
        for (ImportRow rr : rows) {
            if (rr.nip != null && !rr.nip.isBlank()) {
                dupMap.computeIfAbsent(rr.nip, k -> new ArrayList<>()).add(rr.rowIndex);
            }
        }
        dupMap.entrySet().removeIf(e -> e.getValue().size() < 2);
        if (!dupMap.isEmpty()) {
            for (var e : dupMap.entrySet()) {
                plan.errors++;
                plan.errorDetails.add("Duplikat NIP " + e.getKey() + " pada baris " + e.getValue());
            }
            rows = rows.stream()
                    .collect(Collectors.toMap(r -> r.nip, Function.identity(), (a, b) -> a, LinkedHashMap::new))
                    .values().stream().toList();
        }

        Set<String> importedNips = rows.stream()
                .map(r -> r.nip)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, Employee> existingByNip = empRepo.findWithPositionsByNipIn(importedNips).stream()
                .collect(Collectors.toMap(Employee::getNip, Function.identity()));

        for (ImportRow r : rows) {
            try {
                Regional regional = resolveRegional(r.regionalName, !dryRun);
                Division division = resolveDivision(r.divisionName, !dryRun);
                Unit unit = resolveUnit(r.unitName, !dryRun);
                JobPosition job = resolveJob(r.jobName, !dryRun);

                Regional regional2 = resolveRegional(r.regionalName2, !dryRun);
                Division division2 = resolveDivision(r.divisionName2, !dryRun);
                Unit unit2 = resolveUnit(r.unitName2, !dryRun);
                JobPosition job2 = resolveJob(r.jobName2, !dryRun);

                Employee existing = existingByNip.get(r.nip);

                if (existing == null) {
                    Employee emp = Employee.builder()
                            .nip(r.nip)
                            .name(r.name)
                            .gender(r.gender)
                            .email(r.email)
                            // Legacy fields removed
                            .status("ACTIVE")
                            // effectiveDate removed from Employee entity
                            // syncPrimaryPosition handles effectiveDate in positions.
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();

                    if (!dryRun) {
                        emp = empRepo.save(Objects.requireNonNull(emp));
                        createPositions(emp, regional, division, unit, job, r.effectiveDate,
                                regional2, division2, unit2, job2, r.effectiveDate2);
                    }

                    plan.newEmployees.add(emp);
                    plan.createdOrRehiredForAccount.add(emp);
                    plan.created++;
                    continue;
                }

                boolean wasResign = "RESIGN".equalsIgnoreCase(existing.getStatus());

                if (wasResign) {
                    if (!dryRun) {
                        EmployeePosition primary = existing.getPrimaryPosition();
                        String oldJobTitle = primary != null && primary.getJobPosition() != null
                                ? primary.getJobPosition().getName()
                                : null;
                        String oldUnitName = primary != null && primary.getUnit() != null ? primary.getUnit().getName()
                                : null;
                        String oldDivisionName = primary != null && primary.getDivision() != null
                                ? primary.getDivision().getName()
                                : null;
                        String oldRegionalName = primary != null && primary.getRegional() != null
                                ? primary.getRegional().getName()
                                : null;

                        // Check changes against PRIMARY
                        boolean orgChanged = false;
                        if (primary != null) {
                            orgChanged = !sameEntity(primary.getRegional(), regional)
                                    || !sameEntity(primary.getDivision(), division)
                                    || !sameEntity(primary.getUnit(), unit)
                                    || !sameEntity(primary.getJobPosition(), job);
                        } else {
                            // If no primary (weird for legacy data?), assume changed if new values present
                            orgChanged = (regional != null || division != null || unit != null || job != null);
                        }

                        existing.setStatus("ACTIVE");
                        existing.setName(r.name);
                        existing.setEmail(r.email);
                        existing.setGender(r.gender);
                        // Do not set legacy fields

                        existing.setUpdatedAt(Instant.now());

                        updatePositions(existing, regional, division, unit, job, r.effectiveDate,
                                regional2, division2, unit2, job2, r.effectiveDate2);

                        EmployeeHistory.EmployeeActionType type = orgChanged
                                ? EmployeeHistory.EmployeeActionType.MUTASI
                                : EmployeeHistory.EmployeeActionType.REHIRED;

                        historyService.snapshotWithOldValues(
                                existing,
                                oldJobTitle,
                                oldUnitName,
                                oldDivisionName,
                                oldRegionalName,
                                type,
                                r.effectiveDate);
                    }

                    plan.rehiredEmployees.add(existing);
                    plan.createdOrRehiredForAccount.add(existing);
                    plan.rehired++;
                    continue;
                }

                boolean primaryChanged = primaryPlacementChanged(existing, regional, division, unit, job);
                boolean secondaryChanged = secondaryPlacementChanged(existing, regional2, division2, unit2, job2);
                boolean mutasi = primaryChanged || secondaryChanged;
                boolean changedProfile = profileChanged(existing, r.name, r.email, r.gender);

                if (mutasi) {
                    if (!dryRun) {
                        EmployeePosition primary = existing.getPrimaryPosition();
                        String oldJobTitle = primary != null && primary.getJobPosition() != null
                                ? primary.getJobPosition().getName()
                                : null;
                        String oldUnitName = primary != null && primary.getUnit() != null ? primary.getUnit().getName()
                                : null;
                        String oldDivisionName = primary != null && primary.getDivision() != null
                                ? primary.getDivision().getName()
                                : null;
                        String oldRegionalName = primary != null && primary.getRegional() != null
                                ? primary.getRegional().getName()
                                : null;

                        // Do not set legacy fields

                        existing.setUpdatedAt(Instant.now());

                        updatePositions(existing, regional, division, unit, job, r.effectiveDate,
                                regional2, division2, unit2, job2, r.effectiveDate2);

                        // We need effective date for history... use request effective date or primary's
                        LocalDate effDate = r.effectiveDate;

                        historyService.snapshotWithOldValues(
                                existing,
                                oldJobTitle,
                                oldUnitName,
                                oldDivisionName,
                                oldRegionalName,
                                EmployeeHistory.EmployeeActionType.MUTASI,
                                effDate);
                    }
                    plan.mutatedEmployees.add(existing);
                    plan.mutated++;
                } else if (changedProfile) {
                    if (!dryRun) {
                        EmployeePosition primary = existing.getPrimaryPosition();
                        String oldJobTitle = primary != null && primary.getJobPosition() != null
                                ? primary.getJobPosition().getName()
                                : null;
                        String oldUnitName = primary != null && primary.getUnit() != null ? primary.getUnit().getName()
                                : null;
                        String oldDivisionName = primary != null && primary.getDivision() != null
                                ? primary.getDivision().getName()
                                : null;
                        String oldRegionalName = primary != null && primary.getRegional() != null
                                ? primary.getRegional().getName()
                                : null;

                        if (!Objects.equals(existing.getName(), r.name))
                            existing.setName(r.name);
                        if (!Objects.equals(existing.getEmail(), r.email))
                            existing.setEmail(r.email);
                        if (!Objects.equals(existing.getGender(), r.gender))
                            existing.setGender(r.gender);

                        // Do not set legacy fields including effectiveDate

                        existing.setUpdatedAt(Instant.now());

                        updatePositions(existing, regional, division, unit, job, r.effectiveDate,
                                regional2, division2, unit2, job2, r.effectiveDate2);

                        // Check if org changed implicitly (even though mutasi=false? logic says
                        // placementChanged false, so org not changed)
                        // But wait, updatePositions might change effective date?
                        // If logic says !mutasi, then org didn't change.
                        // Wait, orgChanged check below in original code was:
                        /*
                         * boolean orgChanged = !sameEntityName(oldRegionalName,
                         * existing.getRegional() != null ? existing.getRegional().getName() : null)
                         * ...
                         */
                        // Since we don't update legacy, and placementChanged returned false, orgChanged
                        // should be false.
                        // Exception: maybe simple update of other fields?

                        EmployeeHistory.EmployeeActionType type = EmployeeHistory.EmployeeActionType.UPDATED;

                        historyService.snapshotWithOldValues(
                                existing,
                                oldJobTitle,
                                oldUnitName,
                                oldDivisionName,
                                oldRegionalName,
                                type,
                                r.effectiveDate);
                    }
                    plan.updatedEmployees.add(existing);
                    plan.updated++;
                }
            } catch (Exception ex) {
                plan.errors++;
                plan.errorDetails.add("Row " + r.rowIndex + ": " + ex.getMessage());
            }
        }

        // Optimized: Use lightweight query to get all non-deleted employees for resign
        // check
        List<Employee> allNonDeleted = empRepo.findByDeletedAtIsNull();

        // First pass: identify resignees
        List<Employee> resignCandidates = new ArrayList<>();
        for (Employee e : allNonDeleted) {
            if (!importedNips.contains(e.getNip()) && !"RESIGN".equalsIgnoreCase(e.getStatus())) {
                resignCandidates.add(e);
            }
        }

        if (!resignCandidates.isEmpty() && !dryRun) {
            // Optimized: Batch load all positions for resign candidates
            Set<Long> resignIds = resignCandidates.stream().map(Employee::getId).collect(Collectors.toSet());
            Map<Long, List<EmployeePosition>> positionsByEmpId = positionRepo
                    .findByEmployeeIdInAndDeletedAtIsNull(resignIds)
                    .stream().collect(Collectors.groupingBy(p -> p.getEmployee().getId()));

            List<EmployeePosition> allPositionsToSave = new ArrayList<>();
            Instant now = Instant.now();

            for (Employee e : resignCandidates) {
                e.setStatus("RESIGN");
                e.setUpdatedAt(now);

                List<EmployeePosition> positions = positionsByEmpId.getOrDefault(e.getId(), List.of());
                for (EmployeePosition p : positions) {
                    p.setIsActive(false);
                    p.setUpdatedAt(now);
                    allPositionsToSave.add(p);
                }

                historyService.snapshot(e, EmployeeHistory.EmployeeActionType.RESIGN, LocalDate.now());
                plan.resignedEmployees.add(e);
                plan.resigned++;
            }

            // Batch save all positions
            if (!allPositionsToSave.isEmpty()) {
                positionRepo.saveAll(allPositionsToSave);
            }
        } else {
            // Dry run - just count
            for (Employee e : resignCandidates) {
                plan.resignedEmployees.add(e);
                plan.resigned++;
            }
        }

        return plan;
    }

    private List<ImportRow> parseExcel(MultipartFile file) throws Exception {
        // ... (truncated for brevity, logic remains same)
        return parseExcelInternal(file);
    }

    // Helper to avoid duplicate code in replacement
    private List<ImportRow> parseExcelInternal(MultipartFile file) throws Exception {
        List<ImportRow> out = new ArrayList<>();
        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;

                String nip = safe(fmt.formatCellValue(row.getCell(4)));
                if (nip.isEmpty())
                    continue;

                String regionalName = safe(fmt.formatCellValue(row.getCell(0)));
                String divisionName = safe(fmt.formatCellValue(row.getCell(1)));
                String unitName = safe(fmt.formatCellValue(row.getCell(2)));
                String jobName = safe(fmt.formatCellValue(row.getCell(3)));
                String name = safe(fmt.formatCellValue(row.getCell(5)));
                String gender = safe(fmt.formatCellValue(row.getCell(6)));
                String email = safe(fmt.formatCellValue(row.getCell(7)));
                LocalDate effDate = parseDateSafe(row.getCell(8), safe(fmt.formatCellValue(row.getCell(8))));

                String regionalName2 = safe(fmt.formatCellValue(row.getCell(9)));
                String divisionName2 = safe(fmt.formatCellValue(row.getCell(10)));
                String unitName2 = safe(fmt.formatCellValue(row.getCell(11)));
                String jobName2 = safe(fmt.formatCellValue(row.getCell(12)));
                LocalDate effDate2 = parseDateSafe(row.getCell(13), safe(fmt.formatCellValue(row.getCell(13))));

                out.add(new ImportRow(i + 1, nip, name, gender, email,
                        regionalName, divisionName, unitName, jobName, effDate,
                        regionalName2, divisionName2, unitName2, jobName2, effDate2));
            }
        }
        return out;
    }

    private String safe(String s) {
        return s == null ? "" : s.trim();
    }

    private void saveImportLog(User user, MultipartFile file, ImportPlan plan) {
        logRepo.save(Objects.requireNonNull(EmployeeImportLog.builder()
                .user(user)
                .fileName(file.getOriginalFilename())
                .totalProcessed(plan.processed)
                .totalCreated(plan.created)
                .totalUpdated(plan.updated)
                .totalMutated(plan.mutated)
                .totalResigned(plan.resigned)
                .totalErrors(plan.errors)
                .dryRun(false)
                .createdAt(Instant.now())
                .build()));
    }

    private boolean profileChanged(Employee emp, String name, String email, String gender) {
        return !Objects.equals(emp.getName(), name)
                || !Objects.equals(emp.getEmail(), email)
                || !Objects.equals(emp.getGender(), gender);
    }

    private boolean primaryPlacementChanged(Employee e, Regional r, Division d, Unit u, JobPosition j) {
        EmployeePosition primary = e.getPrimaryPosition();
        if (primary == null)
            return true; // Treat as changed if missing primary

        return !sameEntity(primary.getRegional(), r)
                || !sameEntity(primary.getDivision(), d)
                || !sameEntity(primary.getUnit(), u)
                || !sameEntity(primary.getJobPosition(), j);
    }

    private boolean secondaryPlacementChanged(Employee e, Regional r2, Division d2, Unit u2, JobPosition j2) {
        EmployeePosition secondary = e.getSecondaryPosition();

        // If no secondary before and no secondary now -> no change
        if (secondary == null && j2 == null)
            return false;

        // If secondary exists but now removed -> changed
        if (secondary != null && j2 == null)
            return true;

        // If no secondary before but now adding -> changed
        if (secondary == null && j2 != null)
            return true;

        // Both exist, check fields
        if (secondary == null)
            return true; // Safeguard

        return !sameEntity(secondary.getRegional(), r2)
                || !sameEntity(secondary.getDivision(), d2)
                || !sameEntity(secondary.getUnit(), u2)
                || !sameEntity(secondary.getJobPosition(), j2);
    }

    private boolean sameEntity(Object a, Object b) {
        if (a == b)
            return true;
        if (a == null || b == null)
            return false;
        try {
            var idA = a.getClass().getMethod("getId").invoke(a);
            var idB = b.getClass().getMethod("getId").invoke(b);
            return Objects.equals(idA, idB);
        } catch (Exception e) {
            return false;
        }
    }

    private LocalDate parseDateSafe(Cell cell, String val) {
        try {
            if (cell != null && cell.getCellType() == CellType.NUMERIC)
                return cell.getLocalDateTimeCellValue().toLocalDate();
            if (val != null && val.matches("\\d{4}-\\d{2}-\\d{2}"))
                return LocalDate.parse(val, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception ignored) {
        }
        return null;
    }

    private Regional resolveRegional(String name, boolean createIfMissing) {
        return resolveCached(name, regionalCache, regionalRepo::findByNameIgnoreCase,
                n -> createIfMissing ? regionalRepo.save(Objects.requireNonNull(Regional.builder().name(n).build()))
                        : null);
    }

    private Division resolveDivision(String name, boolean createIfMissing) {
        return resolveCached(name, divisionCache, divisionRepo::findByNameIgnoreCase,
                n -> createIfMissing ? divisionRepo.save(Objects.requireNonNull(Division.builder().name(n).build()))
                        : null);
    }

    private Unit resolveUnit(String name, boolean createIfMissing) {
        return resolveCached(name, unitCache, unitRepo::findByNameIgnoreCase,
                n -> createIfMissing ? unitRepo.save(Objects.requireNonNull(Unit.builder().name(n).build())) : null);
    }

    private JobPosition resolveJob(String name, boolean createIfMissing) {
        return resolveCached(name, jobCache, jobRepo::findByNameIgnoreCase,
                n -> createIfMissing ? jobRepo.save(Objects.requireNonNull(JobPosition.builder().name(n).build()))
                        : null);
    }

    private <T> T resolveCached(
            String name,
            Map<String, T> cache,
            java.util.function.Function<String, Optional<T>> finder,
            java.util.function.Function<String, T> creator) {
        if (name == null || name.isBlank())
            return null;
        String key = norm(name);
        T cached = cache.get(key);
        if (cached != null)
            return cached;

        Optional<T> found = finder.apply(name);
        if (found.isPresent()) {
            T val = found.get();
            cache.put(key, val);
            return val;
        }

        T created = creator.apply(name);
        if (created != null)
            cache.put(key, created);
        return created;
    }

    private String norm(String s) {
        return s == null ? "" : s.trim().toLowerCase();
    }

    private <T> void batchSave(List<T> list, java.util.function.Consumer<List<T>> saver) {
        if (list == null || list.isEmpty())
            return;
        for (int i = 0; i < list.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, list.size());
            saver.accept(list.subList(i, end));
            em.flush();
            em.clear();
        }
    }

    private void createPositions(Employee emp, Regional reg, Division div, Unit unit, JobPosition job,
            LocalDate effDate,
            Regional reg2, Division div2, Unit unit2, JobPosition job2, LocalDate effDate2) {
        Instant now = Instant.now();

        if (job != null) {
            EmployeePosition primary = EmployeePosition.builder()
                    .employee(emp)
                    .positionType(EmployeePosition.PositionType.PRIMARY)
                    .regional(reg)
                    .division(div)
                    .unit(unit)
                    .jobPosition(job)
                    .effectiveDate(effDate)
                    .isActive(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            positionRepo.save(Objects.requireNonNull(primary));
        }

        if (job2 != null) {
            EmployeePosition secondary = EmployeePosition.builder()
                    .employee(emp)
                    .positionType(EmployeePosition.PositionType.SECONDARY)
                    .regional(reg2)
                    .division(div2)
                    .unit(unit2)
                    .jobPosition(job2)
                    .effectiveDate(effDate2)
                    .isActive(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            positionRepo.save(Objects.requireNonNull(secondary));
        }
    }

    private void updatePositions(Employee emp, Regional reg, Division div, Unit unit, JobPosition job,
            LocalDate effDate,
            Regional reg2, Division div2, Unit unit2, JobPosition job2, LocalDate effDate2) {
        Instant now = Instant.now();

        EmployeePosition primary = positionRepo.findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(
                emp.getId(), EmployeePosition.PositionType.PRIMARY).orElse(null);

        if (primary == null && job != null) {
            primary = EmployeePosition.builder()
                    .employee(emp)
                    .positionType(EmployeePosition.PositionType.PRIMARY)
                    .createdAt(now)
                    .build();
        }

        if (primary != null) {
            primary.setRegional(reg);
            primary.setDivision(div);
            primary.setUnit(unit);
            primary.setJobPosition(job);
            primary.setEffectiveDate(effDate);
            primary.setUpdatedAt(now);
            positionRepo.save(primary);
        }

        EmployeePosition secondary = positionRepo.findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(
                emp.getId(), EmployeePosition.PositionType.SECONDARY).orElse(null);

        if (job2 != null) {
            if (secondary == null) {
                secondary = EmployeePosition.builder()
                        .employee(emp)
                        .positionType(EmployeePosition.PositionType.SECONDARY)
                        .createdAt(now)
                        .build();
            }
            secondary.setRegional(reg2);
            secondary.setDivision(div2);
            secondary.setUnit(unit2);
            secondary.setJobPosition(job2);
            secondary.setEffectiveDate(effDate2);
            secondary.setUpdatedAt(now);
            positionRepo.save(secondary);
        } else if (secondary != null) {
            secondary.setDeletedAt(now);
            positionRepo.save(secondary);
        }
    }

    private void runAfterCommit(Runnable task) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                task.run();
            }
        });
    }

    private void safe(Runnable r) {
        try {
            r.run();
        } catch (Exception ex) {
            log.warn("Post-commit task failed: {}", ex.getMessage(), ex);
        }
    }

    private record ImportRow(
            int rowIndex, String nip, String name, String gender, String email,
            String regionalName, String divisionName, String unitName, String jobName, LocalDate effectiveDate,
            String regionalName2, String divisionName2, String unitName2, String jobName2, LocalDate effectiveDate2) {
    }

    private static class ImportPlan {
        int processed = 0, created = 0, updated = 0, mutated = 0, resigned = 0, rehired = 0, errors = 0;

        List<String> errorDetails = new ArrayList<>();

        List<Employee> newEmployees = new ArrayList<>();
        List<Employee> updatedEmployees = new ArrayList<>();
        List<Employee> mutatedEmployees = new ArrayList<>();
        List<Employee> resignedEmployees = new ArrayList<>();

        List<Employee> rehiredEmployees = new ArrayList<>();
        List<Employee> createdOrRehiredForAccount = new ArrayList<>();

        EmployeeImportResponse toResponse(String fileName, boolean dryRun) {
            return EmployeeImportResponse.builder()
                    .fileName(fileName)
                    .dryRun(dryRun)
                    .processed(processed)
                    .created(created)
                    .updated(updated)
                    .mutated(mutated)
                    .resigned(resigned)
                    .rehired(rehired)
                    .errors(errors)
                    .errorDetails(errorDetails)
                    .build();
        }
    }
}
