package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeEligibilityExceptionImportLogResponse;
import com.bankmega.certification.dto.EmployeeEligibilityExceptionImportResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeEligibilityExceptionImportService {

    private final EmployeeRepository employeeRepo;
    private final CertificationRuleRepository ruleRepo;
    private final EmployeeEligibilityExceptionRepository exceptionRepo;
    private final EligibilityExceptionImportLogRepository logRepo;

    // ===================== DRYRUN & CONFIRM =====================
    public EmployeeEligibilityExceptionImportResponse dryRun(MultipartFile file, User user) throws Exception {
        return process(file, true, user);
    }

    @Transactional
    public EmployeeEligibilityExceptionImportResponse confirm(MultipartFile file, User user) throws Exception {
        EmployeeEligibilityExceptionImportResponse response = process(file, false, user);
        response.setMessage("Import exception berhasil oleh " + (user != null ? user.getUsername() : "-"));
        return response;
    }

    // ===================== GET LOGS =====================
    public List<EmployeeEligibilityExceptionImportLogResponse> getAllLogsDto() {
        return logRepo.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<EmployeeEligibilityExceptionImportLogResponse> getLogsByUserDto(Long userId) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private EmployeeEligibilityExceptionImportLogResponse toResponse(EmployeeEligibilityExceptionImportLog log) {
        return EmployeeEligibilityExceptionImportLogResponse.builder()
                .id(log.getId())
                .username(log.getUser() != null ? log.getUser().getUsername() : null)
                .fileName(log.getFileName())
                .totalProcessed(log.getTotalProcessed())
                .totalCreated(log.getTotalCreated())
                .totalUpdated(log.getTotalUpdated())
                .totalDeactivated(log.getTotalDeactivated())
                .totalErrors(log.getTotalErrors())
                .dryRun(log.isDryRun())
                .createdAt(log.getCreatedAt())
                .build();
    }

    // ===================== CORE PROCESS =====================
    private EmployeeEligibilityExceptionImportResponse process(MultipartFile file, boolean dryRun, User user)
            throws Exception {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tidak boleh kosong");
        }

        // 1) Parse ke rows ringan + kumpulkan key untuk prefetch
        List<RowDto> rows = new ArrayList<>();
        Set<String> nips = new LinkedHashSet<>();
        Set<RuleKey> ruleKeys = new LinkedHashSet<>();

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);
            DataFormatter fmt = new DataFormatter();

            for (Row row : sheet) {
                if (row.getRowNum() == 0)
                    continue; // skip header
                String nip = getCellValue(row.getCell(0), fmt);
                String name = getCellValue(row.getCell(1), fmt);
                String certCode = getCellValue(row.getCell(2), fmt);
                String levelStr = getCellValue(row.getCell(3), fmt);
                String subCode = getCellValue(row.getCell(4), fmt);
                String notes = getCellValue(row.getCell(5), fmt);
                String activeFlag = getCellValue(row.getCell(6), fmt);

                rows.add(new RowDto(row.getRowNum() + 1, nip, name, certCode, levelStr, subCode, notes, activeFlag));

                if (!nip.isBlank())
                    nips.add(nip.trim());
                if (!certCode.isBlank()) {
                    Integer lvl = parseLevel(levelStr);
                    ruleKeys.add(new RuleKey(certCode.trim(), lvl, emptyToNull(subCode)));
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid file format", e);
        }

        int processed = 0, created = 0, reactivated = 0, updated = 0, deactivated = 0, skipped = 0, errors = 0;
        List<String> errorDetails = new ArrayList<>();

        if (rows.isEmpty()) {
            return EmployeeEligibilityExceptionImportResponse.builder()
                    .fileName(file.getOriginalFilename())
                    .dryRun(dryRun)
                    .processed(0)
                    .created(0)
                    .updated(0)
                    .deactivated(0)
                    .errors(0)
                    .errorDetails(List.of())
                    .message("Tidak ada data")
                    .build();
        }

        // 2) Prefetch & cache
        Map<String, Employee> empByNip = employeeRepo.findByNipIn(new ArrayList<>(nips)).stream()
                .collect(Collectors.toMap(Employee::getNip, e -> e, (a, b) -> a, LinkedHashMap::new));

        // Ambil seluruh rule berdasarkan certCode dulu (minim query)
        Map<String, List<CertificationRule>> rulesByCode = new LinkedHashMap<>();
        for (String code : ruleKeys.stream().map(RuleKey::code).collect(Collectors.toCollection(LinkedHashSet::new))) {
            rulesByCode.put(code, ruleRepo.findByCertification_CodeIgnoreCaseAndDeletedAtIsNull(code));
        }

        // cache untuk kombinasi spesifik (code, level, sub)
        Map<RuleKey, CertificationRule> ruleCache = new HashMap<>();

        // 3) Proses baris
        for (RowDto r : rows) {
            processed++;
            try {
                if (r.nip().isBlank() || r.certCode().isBlank()) {
                    throw new IllegalArgumentException("NIP & CertificationCode wajib diisi");
                }

                Employee emp = empByNip.get(r.nip().trim());
                if (emp == null || emp.getDeletedAt() != null) {
                    throw new IllegalArgumentException("Employee tidak ditemukan atau non-aktif: " + r.nip());
                }
                if ("RESIGN".equalsIgnoreCase(safe(emp.getStatus()))) {
                    // policy: jangan buat/aktifkan exception utk pegawai resign
                    throw new IllegalArgumentException("Pegawai RESIGN: " + r.nip());
                }

                // optional validate name
                if (!r.name().isBlank() && emp.getName() != null
                        && !emp.getName().equalsIgnoreCase(r.name().trim())) {
                    throw new IllegalArgumentException("Nama tidak sesuai untuk NIP " + r.nip());
                }

                Integer level = parseLevel(r.levelStr());
                RuleKey key = new RuleKey(r.certCode().trim(), level, emptyToNull(r.subCode()));
                CertificationRule rule = resolveRule(key, rulesByCode, ruleCache);

                boolean shouldActive = parseActiveFlag(r.activeFlag()); // default true
                Instant now = Instant.now();

                // ambil exception existing (aktif / soft-deleted)
                EmployeeEligibilityException ex = exceptionRepo
                        .findFirstByEmployeeIdAndCertificationRuleId(emp.getId(), rule.getId())
                        .orElse(null);

                if (ex == null) {
                    // CREATE baru
                    created++;
                    if (!dryRun) {
                        EmployeeEligibilityException nu = EmployeeEligibilityException.builder()
                                .employee(emp)
                                .certificationRule(rule)
                                .isActive(shouldActive)
                                .notes(nullIfBlank(r.notes()))
                                .createdAt(now)
                                .updatedAt(now)
                                .build();
                        exceptionRepo.save(nu);
                    }
                    continue;
                }

                if (ex.getDeletedAt() != null) {
                    // REACTIVATE (un-delete)
                    reactivated++;
                    if (!dryRun) {
                        ex.setDeletedAt(null);
                        ex.setIsActive(shouldActive);
                        ex.setNotes(nullIfBlank(r.notes()));
                        ex.setUpdatedAt(now);
                        exceptionRepo.save(ex);
                    }
                    continue;
                }

                // existing & not deleted
                if (!shouldActive && Boolean.TRUE.equals(ex.getIsActive())) {
                    // DEACTIVATE
                    deactivated++;
                    if (!dryRun) {
                        ex.setIsActive(false);
                        ex.setDeletedAt(now);
                        ex.setUpdatedAt(now);
                        exceptionRepo.save(ex);
                    }
                    continue;
                }

                // UPDATE fields (notes / isActive)
                boolean needUpdate = false;
                String newNotes = nullIfBlank(r.notes());
                if (!Objects.equals(ex.getNotes(), newNotes)) {
                    ex.setNotes(newNotes);
                    needUpdate = true;
                }
                if (!Objects.equals(ex.getIsActive(), shouldActive)) {
                    // Jika mau aktifkan kembali, pastikan emp masih aktif
                    if (shouldActive
                            && ("RESIGN".equalsIgnoreCase(safe(emp.getStatus())) || emp.getDeletedAt() != null)) {
                        throw new IllegalArgumentException(
                                "Tidak bisa mengaktifkan exception untuk pegawai RESIGN/non-aktif: " + r.nip());
                    }
                    ex.setIsActive(shouldActive);
                    needUpdate = true;
                }

                if (needUpdate) {
                    updated++;
                    if (!dryRun) {
                        ex.setUpdatedAt(now);
                        exceptionRepo.save(ex);
                    }
                } else {
                    skipped++;
                }

            } catch (Exception e) {
                errors++;
                errorDetails.add("Row " + r.row() + ": ERROR → " + e.getMessage());
            }
        }

        // 4) Save log (confirm only)
        if (!dryRun) {
            if (user == null || user.getId() == null) {
                throw new IllegalArgumentException("User tidak boleh null saat simpan import log");
            }
            EmployeeEligibilityExceptionImportLog log = EmployeeEligibilityExceptionImportLog.builder()
                    .user(user)
                    .fileName(file.getOriginalFilename())
                    .totalProcessed(processed)
                    .totalCreated(created)
                    .totalUpdated(updated + reactivated) // updated = update + reactivate (sesuai versi lo)
                    .totalDeactivated(deactivated)
                    .totalErrors(errors)
                    .dryRun(false)
                    .createdAt(Instant.now())
                    .build();
            logRepo.save(log);
        }

        return EmployeeEligibilityExceptionImportResponse.builder()
                .fileName(file.getOriginalFilename())
                .dryRun(dryRun)
                .processed(processed)
                .created(created)
                .updated(updated + reactivated)
                .deactivated(deactivated)
                .errors(errors)
                .errorDetails(errorDetails)
                .message(dryRun
                        ? String.format(
                                "Dry run selesai ✅. Baru: %d, reactivate: %d, update: %d, nonaktif: %d, skip: %d",
                                created, reactivated, updated, deactivated,
                                Math.max(0, processed - (created + reactivated + updated + deactivated + errors)))
                        : "Import selesai ✅ oleh " + (user != null ? user.getUsername() : "-"))
                .build();
    }

    // ===================== HELPER =====================
    private static String safe(String s) {
        return s == null ? "" : s;
    }

    private static String emptyToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String nullIfBlank(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private Integer parseLevel(String levelStr) {
        if (levelStr == null || levelStr.isBlank())
            return null;
        try {
            return Integer.valueOf(levelStr.trim());
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Level harus angka, dapat: " + levelStr);
        }
    }

    private boolean parseActiveFlag(String flag) {
        if (flag == null || flag.isBlank())
            return true; // default aktif
        String f = flag.trim().toLowerCase();
        return f.equals("y") || f.equals("yes") || f.equals("1") || f.equals("true");
    }

    private CertificationRule resolveRule(RuleKey key,
            Map<String, List<CertificationRule>> rulesByCode,
            Map<RuleKey, CertificationRule> cache) {
        CertificationRule cached = cache.get(key);
        if (cached != null)
            return cached;

        List<CertificationRule> candidates = rulesByCode.getOrDefault(key.code(), List.of());
        List<CertificationRule> filtered = candidates.stream()
                .filter(rule -> (key.level() == null || (rule.getCertificationLevel() != null &&
                        Objects.equals(rule.getCertificationLevel().getLevel(), key.level())))
                        &&
                        (key.subCode() == null || (rule.getSubField() != null &&
                                key.subCode().equalsIgnoreCase(rule.getSubField().getCode()))))
                .toList();

        if (filtered.isEmpty()) {
            throw new IllegalArgumentException("Certification Rule tidak ditemukan untuk code=" + key.code()
                    + ", level=" + key.level() + ", subField=" + key.subCode());
        }
        if (filtered.size() > 1) {
            throw new IllegalArgumentException("Certification Rule ambigu (lebih dari satu) untuk code=" + key.code()
                    + ", level=" + key.level() + ", subField=" + key.subCode());
        }

        CertificationRule rule = filtered.get(0);
        cache.put(key, rule);
        return rule;
    }

    private String getCellValue(Cell cell, DataFormatter formatter) {
        return cell == null ? "" : formatter.formatCellValue(cell).trim();
    }

    // ===================== TEMPLATE =====================
    @Transactional(readOnly = true)
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Exceptions");

            Row header = sheet.createRow(0);
            String[] columns = { "NIP", "Nama", "CertCode", "Level", "SubCode", "Notes", "ActiveFlag (Y/N)" };
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            headerStyle.setFont(font);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
                sheet.autoSizeColumn(i);
            }

            // contoh row
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("23101918");
            example.createCell(1).setCellValue("SITI RAHAYU");
            example.createCell(2).setCellValue("SMR");
            example.createCell(3).setCellValue("5");
            example.createCell(4).setCellValue("");
            example.createCell(5).setCellValue("Keterangan opsional");
            example.createCell(6).setCellValue("Y");

            byte[] bytes;
            try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                workbook.write(out);
                bytes = out.toByteArray();
            }

            ByteArrayResource resource = new ByteArrayResource(bytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=exception_template.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(bytes.length)
                    .body(resource);

        } catch (IOException e) {
            throw new RuntimeException("Gagal membuat template Excel", e);
        }
    }

    // ===================== DTOs & Keys =====================
    private record RowDto(
            int row,
            String nip,
            String name,
            String certCode,
            String levelStr,
            String subCode,
            String notes,
            String activeFlag) {
    }

    private record RuleKey(String code, Integer level, String subCode) {
    }
}
