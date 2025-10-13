package com.bankmega.certification.service.employee_import;

import com.bankmega.certification.dto.*;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.service.EmployeeHistoryService;
import com.bankmega.certification.service.UserService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
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
    private final EmployeeImportLogRepository logRepo;
    private final EmployeeHistoryService historyService;
    private final UserService userService;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;

    private final Map<String, Regional> regionalCache = new ConcurrentHashMap<>();
    private final Map<String, Division> divisionCache = new ConcurrentHashMap<>();
    private final Map<String, Unit> unitCache = new ConcurrentHashMap<>();
    private final Map<String, JobPosition> jobCache = new ConcurrentHashMap<>();

    private Role pegawaiRole;

    private final List<Employee> newEmployees = new ArrayList<>();
    private final List<Employee> changedEmployees = new ArrayList<>();
    private final List<Employee> resignedEmployees = new ArrayList<>();

    @PostConstruct
    public void initRole() {
        pegawaiRole = roleRepo.findByNameIgnoreCase("Pegawai")
                .orElseGet(() -> roleRepo.save(
                        Role.builder()
                                .name("Pegawai")
                                .createdAt(Instant.now())
                                .updatedAt(Instant.now())
                                .build()));
    }

    // ===========================================================
    // 🔹 PUBLIC ENTRY POINTS
    // ===========================================================

    public EmployeeImportResponse dryRun(MultipartFile file, User user) throws Exception {
        preloadMasters();
        EmployeeImportResponse res = process(file, true, user);
        res.setMessage("✅ Dry run selesai oleh " + user.getUsername());
        return res;
    }

    @Transactional
    public EmployeeImportResponse confirm(MultipartFile file, User user) throws Exception {
        preloadMasters();
        EmployeeImportResponse res = process(file, false, user);

        empRepo.saveAll(newEmployees);
        empRepo.saveAll(changedEmployees);
        empRepo.saveAll(resignedEmployees);
        historyService.flushBatch();
        saveImportLog(user, file, res);

        res.setMessage("✅ Import pegawai berhasil oleh " + user.getUsername());
        return res;
    }

    public void preloadMasters() {
        if (regionalCache.isEmpty())
            regionalRepo.findAll().forEach(r -> regionalCache.put(r.getName().toLowerCase(), r));
        if (divisionCache.isEmpty())
            divisionRepo.findAll().forEach(d -> divisionCache.put(d.getName().toLowerCase(), d));
        if (unitCache.isEmpty())
            unitRepo.findAll().forEach(u -> unitCache.put(u.getName().toLowerCase(), u));
        if (jobCache.isEmpty())
            jobRepo.findAll().forEach(j -> jobCache.put(j.getName().toLowerCase(), j));

        log.info("✅ Master data preloaded: {} regionals, {} divisions, {} units, {} jobs",
                regionalCache.size(), divisionCache.size(), unitCache.size(), jobCache.size());
    }

    // ===========================================================
    // 🔸 INTERNAL PROCESS (Stable)
    // ===========================================================

    private EmployeeImportResponse process(MultipartFile file, boolean dryRun, User user) throws Exception {
        int processed = 0, created = 0, updated = 0, mutated = 0, resigned = 0, errors = 0;
        List<String> errorDetails = new ArrayList<>();

        Map<String, Employee> existingEmpMap = empRepo.findAll().stream()
                .collect(Collectors.toMap(Employee::getNip, e -> e));
        Set<String> existingNips = existingEmpMap.keySet();
        Set<String> importedNips = new HashSet<>();
        Set<String> existingUsernames = userRepo.findAll().stream()
                .map(User::getUsername)
                .collect(Collectors.toSet());

        newEmployees.clear();
        changedEmployees.clear();
        resignedEmployees.clear();

        try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = wb.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();

            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null)
                    continue;
                processed++;

                try {
                    String regionalName = fmt.formatCellValue(row.getCell(0)).trim();
                    String divisionName = fmt.formatCellValue(row.getCell(1)).trim();
                    String unitName = fmt.formatCellValue(row.getCell(2)).trim();
                    String jobName = fmt.formatCellValue(row.getCell(3)).trim();
                    String nip = fmt.formatCellValue(row.getCell(4)).trim();
                    String name = fmt.formatCellValue(row.getCell(5)).trim();
                    String gender = fmt.formatCellValue(row.getCell(6)).trim();
                    String email = fmt.formatCellValue(row.getCell(7)).trim();
                    String effStr = fmt.formatCellValue(row.getCell(8)).trim();

                    if (nip.isEmpty())
                        continue;
                    importedNips.add(nip);

                    LocalDate effDate = parseDateSafe(row.getCell(8), effStr);
                    Regional regional = resolveRegional(regionalName);
                    Division division = resolveDivision(divisionName);
                    Unit unit = resolveUnit(unitName);
                    JobPosition job = resolveJob(jobName);

                    Employee emp = existingEmpMap.get(nip);

                    if (emp == null) {
                        created++;
                        if (!dryRun) {
                            emp = Employee.builder()
                                    .nip(nip)
                                    .name(name)
                                    .gender(gender)
                                    .email(email)
                                    .regional(regional)
                                    .division(division)
                                    .unit(unit)
                                    .jobPosition(job)
                                    .status("ACTIVE")
                                    .effectiveDate(effDate)
                                    .createdAt(Instant.now())
                                    .updatedAt(Instant.now())
                                    .build();
                            newEmployees.add(emp);

                            if (!existingUsernames.contains(nip)) {
                                userService.create(UserRequest.builder()
                                        .username(nip)
                                        .email(email)
                                        .password(nip)
                                        .roleId(pegawaiRole.getId())
                                        .isActive(true)
                                        .build());
                                existingUsernames.add(nip);
                            }
                        }
                    } else {
                        boolean mutasi = emp.getJobPosition() != null &&
                                !Objects.equals(emp.getJobPosition().getId(), job.getId());
                        boolean changed = hasChanged(emp, name, email, gender, regional, division, unit, job);

                        if (mutasi) {
                            mutated++;
                            if (!dryRun) {
                                JobPosition oldJob = emp.getJobPosition();
                                emp.setJobPosition(job);
                                emp.setUpdatedAt(Instant.now());
                                if (effDate != null)
                                    emp.setEffectiveDate(effDate);
                                changedEmployees.add(emp);
                                historyService.snapshot(emp, oldJob, job, effDate,
                                        EmployeeHistory.EmployeeActionType.MUTASI);
                            }
                        } else if (changed) {
                            updated++;
                            if (!dryRun) {
                                emp.setName(name);
                                emp.setEmail(email);
                                emp.setGender(gender);
                                emp.setRegional(regional);
                                emp.setDivision(division);
                                emp.setUnit(unit);
                                emp.setUpdatedAt(Instant.now());
                                if (effDate != null)
                                    emp.setEffectiveDate(effDate);
                                changedEmployees.add(emp);
                                historyService.snapshot(emp, EmployeeHistory.EmployeeActionType.UPDATED, effDate);
                            }
                        }
                    }

                } catch (Exception e) {
                    errors++;
                    errorDetails.add("Row " + i + ": " + e.getMessage());
                }
            }
        }

        // Handle resign
        Set<String> resignedNips = new HashSet<>(existingNips);
        resignedNips.removeAll(importedNips);
        resigned = resignedNips.size();

        if (!dryRun && resigned > 0) {
            resignedEmployees.addAll(empRepo.findByNipInAndDeletedAtIsNull(resignedNips));
            resignedEmployees.forEach(emp -> {
                emp.setStatus("RESIGN");
                emp.setUpdatedAt(Instant.now());
                historyService.snapshot(emp, EmployeeHistory.EmployeeActionType.RESIGN, LocalDate.now());
            });
        }

        return EmployeeImportResponse.builder()
                .fileName(file.getOriginalFilename())
                .dryRun(dryRun)
                .processed(processed)
                .created(created)
                .updated(updated)
                .mutated(mutated)
                .resigned(resigned)
                .errors(errors)
                .errorDetails(errorDetails)
                .build();
    }

    // ===========================================================
    // 🔸 HELPERS
    // ===========================================================

    private void saveImportLog(User user, MultipartFile file, EmployeeImportResponse res) {
        logRepo.save(EmployeeImportLog.builder()
                .user(user)
                .fileName(file.getOriginalFilename())
                .totalProcessed(res.getProcessed())
                .totalCreated(res.getCreated())
                .totalUpdated(res.getUpdated())
                .totalMutated(res.getMutated())
                .totalResigned(res.getResigned())
                .totalErrors(res.getErrors())
                .dryRun(false)
                .createdAt(Instant.now())
                .build());
    }

    private boolean hasChanged(Employee emp, String name, String email, String gender,
            Regional reg, Division div, Unit unit, JobPosition job) {
        return !Objects.equals(emp.getName(), name)
                || !Objects.equals(emp.getEmail(), email)
                || !Objects.equals(emp.getGender(), gender)
                || !sameEntity(emp.getRegional(), reg)
                || !sameEntity(emp.getDivision(), div)
                || !sameEntity(emp.getUnit(), unit)
                || !sameEntity(emp.getJobPosition(), job);
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
            if (val.matches("\\d{4}-\\d{2}-\\d{2}"))
                return LocalDate.parse(val, DateTimeFormatter.ISO_LOCAL_DATE);
        } catch (Exception ignored) {
        }
        return null;
    }

    private Regional resolveRegional(String name) {
        return resolveCached(name, regionalCache, regionalRepo::findByNameIgnoreCase,
                n -> regionalRepo.save(Regional.builder().name(n).build()));
    }

    private Division resolveDivision(String name) {
        return resolveCached(name, divisionCache, divisionRepo::findByNameIgnoreCase,
                n -> divisionRepo.save(Division.builder().name(n).build()));
    }

    private Unit resolveUnit(String name) {
        return resolveCached(name, unitCache, unitRepo::findByNameIgnoreCase,
                n -> unitRepo.save(Unit.builder().name(n).build()));
    }

    private JobPosition resolveJob(String name) {
        return resolveCached(name, jobCache, jobRepo::findByNameIgnoreCase,
                n -> jobRepo.save(JobPosition.builder().name(n).build()));
    }

    private <T> T resolveCached(String name, Map<String, T> cache,
            java.util.function.Function<String, Optional<T>> finder,
            java.util.function.Function<String, T> creator) {
        if (name == null || name.isBlank())
            return null;
        return cache.computeIfAbsent(name.toLowerCase(),
                key -> finder.apply(name).orElseGet(() -> creator.apply(name)));
    }
}
