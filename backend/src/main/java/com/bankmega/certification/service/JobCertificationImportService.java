package com.bankmega.certification.service;

import com.bankmega.certification.dto.JobCertImportResponse;
import com.bankmega.certification.dto.JobCertImportLogResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.JobCertificationImportLogRepository;
import com.bankmega.certification.repository.JobCertificationMappingRepository;
import com.bankmega.certification.repository.JobPositionRepository;
import com.bankmega.certification.repository.CertificationRuleRepository;
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
import java.util.*;

@Service
@RequiredArgsConstructor
public class JobCertificationImportService {

    private final JobCertificationImportLogRepository logRepo;
    private final JobPositionRepository jobPositionRepo;
    private final CertificationRuleRepository ruleRepo;
    private final JobCertificationMappingRepository mappingRepo;
    // private final PicCertificationScopeRepository scopeRepo; // kalau mau
    // validasi PIC scope

    public JobCertImportResponse dryRun(MultipartFile file, User user) {
        return process(file, true, user);
    }

    @Transactional
    public JobCertImportResponse confirm(MultipartFile file, User user) {
        JobCertImportResponse response = process(file, false, user);
        response.setMessage("Import berhasil. ⚠️ Jangan lupa refresh eligibility secara manual.");
        return response;
    }

    public List<JobCertificationImportLog> getAllLogs() {
        return logRepo.findAll();
    }

    public List<JobCertificationImportLog> getLogsByUser(Long userId) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId);
    }

    private JobCertImportResponse process(MultipartFile file, boolean dryRun, User user) {
        List<String> errorDetails = new ArrayList<>();
        int processed = 0, inserted = 0, reactivated = 0, skipped = 0, errors = 0;
        int newJobs = 0; // 🔥 tambahan counter job baru

        try (Workbook workbook = new XSSFWorkbook(file.getInputStream())) {
            Sheet sheet = workbook.getSheetAt(0);

            for (Row row : sheet) {
                if (row.getRowNum() == 0)
                    continue; // skip header
                processed++;

                try {
                    String jobName = getCellValue(row.getCell(0));
                    String certCode = getCellValue(row.getCell(1));
                    String levelStr = getCellValue(row.getCell(2));
                    String subField = getCellValue(row.getCell(3));
                    String status = getCellValue(row.getCell(4));

                    if (jobName.isBlank() || certCode.isBlank()) {
                        throw new IllegalArgumentException("Job name & cert code wajib diisi");
                    }

                    // 🔹 Cari CertificationRule
                    CertificationRule rule = findRuleUnique(certCode, levelStr, subField);

                    // 🔹 Cari JobPosition
                    Optional<JobPosition> jobOpt = jobPositionRepo.findByNameIgnoreCase(jobName.trim());
                    JobPosition job;
                    if (jobOpt.isEmpty()) {
                        if (dryRun) {
                            // simulate job baru
                            newJobs++;
                            job = JobPosition.builder()
                                    .id(-1L) // dummy ID supaya gak null
                                    .name(jobName.trim())
                                    .build();
                        } else {
                            job = jobPositionRepo.save(
                                    JobPosition.builder().name(jobName.trim()).build());
                            newJobs++;
                        }
                    } else {
                        job = jobOpt.get();
                    }

                    // 🔹 Cek mapping existing
                    Optional<JobCertificationMapping> existing = mappingRepo.findByJobPositionAndCertificationRule(job,
                            rule);

                    if (existing.isEmpty()) {
                        if (!dryRun) {
                            JobCertificationMapping mapping = JobCertificationMapping.builder()
                                    .jobPosition(job)
                                    .certificationRule(rule)
                                    .isActive(!"INACTIVE".equalsIgnoreCase(status))
                                    .build();
                            mappingRepo.save(mapping);
                        }
                        inserted++;
                    } else {
                        JobCertificationMapping mapping = existing.get();
                        if (mapping.getDeletedAt() != null || !mapping.getIsActive()) {
                            if (!dryRun) {
                                mapping.setDeletedAt(null);
                                mapping.setIsActive(!"INACTIVE".equalsIgnoreCase(status));
                                mappingRepo.save(mapping);
                            }
                            reactivated++;
                        } else {
                            skipped++;
                        }
                    }

                } catch (Exception e) {
                    errors++;
                    errorDetails.add("Row " + row.getRowNum() + ": " + e.getMessage());
                }
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Invalid file format", e);
        }

        // 🔹 Save log
        if (!dryRun) {
            JobCertificationImportLog log = JobCertificationImportLog.builder()
                    .user(user)
                    .fileName(file.getOriginalFilename())
                    .totalProcessed(processed)
                    .totalInserted(inserted)
                    .totalReactivated(reactivated)
                    .totalSkipped(skipped)
                    .totalErrors(errors)
                    .dryRun(false)
                    .build();
            logRepo.save(log);
        }

        return JobCertImportResponse.builder()
                .fileName(file.getOriginalFilename())
                .dryRun(dryRun)
                .processed(processed)
                .inserted(inserted)
                .reactivated(reactivated)
                .skipped(skipped)
                .errors(errors)
                .errorDetails(errorDetails)
                .message(dryRun
                        ? "Dry run completed. Job baru terdeteksi: " + newJobs
                        : "Import completed. Job baru dibuat: " + newJobs)
                .build();
    }

    // 🔹 Helper buat cari CertificationRule
    private CertificationRule findRuleUnique(String certCode, String levelStr, String subFieldCode) {
        Integer tmpLevel = null;
        try {
            if (levelStr != null && !levelStr.isBlank()) {
                tmpLevel = Integer.parseInt(levelStr.trim());
            }
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Level harus berupa angka, tapi dapat: " + levelStr);
        }

        final Integer level = tmpLevel; // ✅ bikin final variable

        String subCode = (subFieldCode == null || subFieldCode.isBlank()) ? null : subFieldCode.trim();

        return ruleRepo
                .findByCertification_CodeIgnoreCaseAndCertificationLevel_LevelAndSubField_CodeIgnoreCaseAndDeletedAtIsNull(
                        certCode.trim(),
                        level,
                        subCode)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Certification Rule tidak ditemukan untuk code=" + certCode
                                + ", level=" + level
                                + ", subField=" + subCode));
    }

    private String getCellValue(Cell cell) {
        if (cell == null)
            return "";
        if (cell.getCellType() == CellType.NUMERIC) {
            return String.valueOf((long) cell.getNumericCellValue());
        }
        return cell.toString().trim();
    }

    @Transactional(readOnly = true)
    public ResponseEntity<ByteArrayResource> downloadTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("JobCertificationMapping");

            // 🔹 Header
            Row header = sheet.createRow(0);
            String[] columns = { "Job Position", "Certification Code", "Level", "SubField Code",
                    "Status (ACTIVE/INACTIVE)" };
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

            // 🔹 Contoh baris
            Row example = sheet.createRow(1);
            example.createCell(0).setCellValue("Software Engineer");
            example.createCell(1).setCellValue("AWS-001");
            example.createCell(2).setCellValue("1");
            example.createCell(3).setCellValue("CLOUD");
            example.createCell(4).setCellValue("ACTIVE");

            // 🔹 Convert workbook → byte[]
            byte[] bytes;
            try (java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream()) {
                workbook.write(out);
                bytes = out.toByteArray();
            }

            ByteArrayResource resource = new ByteArrayResource(bytes);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=job_certification_mapping_template.xlsx")
                    .contentType(MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .contentLength(bytes.length)
                    .body(resource);

        } catch (IOException e) {
            throw new RuntimeException("Gagal membuat template Excel", e);
        }
    }

    private JobCertImportLogResponse toResponse(JobCertificationImportLog log) {
        return JobCertImportLogResponse.builder()
                .id(log.getId())
                .username(log.getUser().getUsername())
                .fileName(log.getFileName())
                .totalProcessed(log.getTotalProcessed())
                .totalInserted(log.getTotalInserted())
                .totalReactivated(log.getTotalReactivated())
                .totalSkipped(log.getTotalSkipped())
                .totalErrors(log.getTotalErrors())
                .dryRun(log.isDryRun())
                .createdAt(log.getCreatedAt())
                .build();
    }

    public List<JobCertImportLogResponse> getAllLogsDto() {
        return logRepo.findAll().stream()
                .map(this::toResponse)
                .toList();
    }

    public List<JobCertImportLogResponse> getLogsByUserDto(Long userId) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }
}
