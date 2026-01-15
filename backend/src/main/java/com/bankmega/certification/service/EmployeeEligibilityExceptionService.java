package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeEligibilityExceptionResponse;
import com.bankmega.certification.entity.EmployeeEligibilityException;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeEligibilityExceptionRepository;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.specification.EmployeeEligibilityExceptionSpecification;
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
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EmployeeEligibilityExceptionService {

        private final EmployeeEligibilityExceptionRepository exceptionRepo;
        private final EmployeeRepository employeeRepo;
        private final CertificationRuleRepository ruleRepo;
        private final EmployeeEligibilityService eligibilityService;

        private EmployeeEligibilityExceptionResponse toResponse(EmployeeEligibilityException e) {
                if (e == null)
                        return null;

                var emp = e.getEmployee();
                var rule = e.getCertificationRule();

                return EmployeeEligibilityExceptionResponse.builder()
                                .id(e.getId())
                                .employeeId(emp != null ? emp.getId() : null)
                                .employeeName(emp != null ? emp.getName() : null)
                                .nip(emp != null ? emp.getNip() : null)
                                .jobPositionTitle(emp != null && emp.getJobPosition() != null
                                                ? emp.getJobPosition().getName()
                                                : null)
                                .certificationRuleId(rule != null ? rule.getId() : null)
                                .certificationCode(rule != null ? rule.getCertification().getCode() : null)
                                .certificationName(rule != null ? rule.getCertification().getName() : null)
                                .certificationLevelName(rule != null && rule.getCertificationLevel() != null
                                                ? rule.getCertificationLevel().getName()
                                                : null)
                                .certificationLevelLevel(rule != null && rule.getCertificationLevel() != null
                                                ? rule.getCertificationLevel().getLevel()
                                                : null)
                                .subFieldName(rule != null && rule.getSubField() != null ? rule.getSubField().getName()
                                                : null)
                                .subFieldCode(rule != null && rule.getSubField() != null ? rule.getSubField().getCode()
                                                : null)
                                .isActive(e.getIsActive())
                                .notes(e.getNotes())
                                .createdAt(e.getCreatedAt())
                                .updatedAt(e.getUpdatedAt())
                                .build();
        }

        @Transactional(readOnly = true)
        public Page<EmployeeEligibilityExceptionResponse> getPagedFiltered(
                        List<Long> employeeIds,
                        List<Long> jobIds,
                        List<String> certCodes,
                        List<Integer> levels,
                        List<String> subCodes,
                        List<String> statuses,
                        String search,
                        List<Long> allowedCertificationIds,
                        Pageable pageable) {

                Specification<EmployeeEligibilityException> spec = buildFilteredSpec(
                                employeeIds, jobIds, certCodes, levels, subCodes, statuses, search,
                                allowedCertificationIds);

                if (pageable.getSort().isUnsorted()) {
                        pageable = PageRequest.of(
                                        pageable.getPageNumber(),
                                        pageable.getPageSize(),
                                        Objects.requireNonNull(defaultSort()));
                }

                return exceptionRepo.findAll(spec, pageable).map(this::toResponse);
        }

        @Transactional(readOnly = true)
        public byte[] exportExcel(
                        List<Long> employeeIds,
                        List<Long> jobIds,
                        List<String> certCodes,
                        List<Integer> levels,
                        List<String> subCodes,
                        List<String> statuses,
                        String search,
                        List<Long> allowedCertificationIds) {

                Specification<EmployeeEligibilityException> spec = buildFilteredSpec(
                                employeeIds, jobIds, certCodes, levels, subCodes, statuses, search,
                                allowedCertificationIds);

                List<EmployeeEligibilityException> rows = exceptionRepo.findAll(spec,
                                Objects.requireNonNull(defaultSort()));
                List<EmployeeEligibilityExceptionResponse> data = rows.stream().map(this::toResponse).toList();

                return buildExceptionExcel(data);
        }

        private Specification<EmployeeEligibilityException> buildFilteredSpec(
                        List<Long> employeeIds,
                        List<Long> jobIds,
                        List<String> certCodes,
                        List<Integer> levels,
                        List<String> subCodes,
                        List<String> statuses,
                        String search,
                        List<Long> allowedCertificationIds) {

                Specification<EmployeeEligibilityException> spec = EmployeeEligibilityExceptionSpecification
                                .notDeleted()
                                .and(EmployeeEligibilityExceptionSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeEligibilityExceptionSpecification.byJobIds(jobIds))
                                .and(EmployeeEligibilityExceptionSpecification.byCertCodes(certCodes))
                                .and(EmployeeEligibilityExceptionSpecification.byLevels(levels))
                                .and(EmployeeEligibilityExceptionSpecification.bySubCodes(subCodes))
                                .and(EmployeeEligibilityExceptionSpecification.byStatuses(statuses))
                                .and(EmployeeEligibilityExceptionSpecification
                                                .byAllowedCertificationIds(allowedCertificationIds))
                                .and(EmployeeEligibilityExceptionSpecification.bySearch(search))
                                .and((root, query, cb) -> {
                                        var emp = root.join("employee", JoinType.INNER);
                                        return cb.and(
                                                        cb.isNull(emp.get("deletedAt")),
                                                        cb.or(
                                                                        cb.isNull(emp.get("status")),
                                                                        cb.notEqual(cb.lower(emp.get("status")),
                                                                                        cb.literal("resign"))));
                                });

                return spec;
        }

        private Sort defaultSort() {
                return Sort.by(
                                Sort.Order.asc("employee.jobPosition.name"),
                                Sort.Order.asc("certificationRule.certification.code"),
                                Sort.Order.asc("certificationRule.certificationLevel.level"),
                                Sort.Order.asc("certificationRule.subField.code"));
        }

        private byte[] buildExceptionExcel(List<EmployeeEligibilityExceptionResponse> data) {
                try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                        Sheet sh = wb.createSheet("Exceptions");

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
                                        "Notes", "Status", "Updated At"
                        };

                        Row hr = sh.createRow(0);
                        for (int i = 0; i < headers.length; i++) {
                                Cell c = hr.createCell(i);
                                c.setCellValue(headers[i]);
                                c.setCellStyle(headerStyle);
                        }

                        int r = 1;
                        for (EmployeeEligibilityExceptionResponse e : data) {
                                Row row = sh.createRow(r++);
                                int col = 0;

                                row.createCell(col++).setCellValue(nz(e.getNip()));
                                row.createCell(col++).setCellValue(nz(e.getEmployeeName()));
                                row.createCell(col++).setCellValue(nz(e.getJobPositionTitle()));

                                row.createCell(col++).setCellValue(nz(e.getCertificationCode()));
                                row.createCell(col++).setCellValue(nz(e.getCertificationName()));
                                row.createCell(col++)
                                                .setCellValue(e.getCertificationLevelLevel() != null
                                                                ? e.getCertificationLevelLevel()
                                                                : 0);
                                row.createCell(col++).setCellValue(nz(e.getSubFieldCode()));

                                row.createCell(col++).setCellValue(nz(e.getNotes()));
                                row.createCell(col++).setCellValue(
                                                Boolean.TRUE.equals(e.getIsActive()) ? "Active" : "Nonactive");
                                setDateCell(row, col++,
                                                e.getUpdatedAt() != null
                                                                ? e.getUpdatedAt()
                                                                                .atZone(java.time.ZoneId
                                                                                                .systemDefault())
                                                                                .toLocalDate()
                                                                : null,
                                                dateStyle);
                        }

                        for (int i = 0; i < headers.length; i++)
                                sh.autoSizeColumn(i);

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

        @Transactional(readOnly = true)
        public List<EmployeeEligibilityExceptionResponse> getByEmployee(Long employeeId) {
                var emp = employeeRepo.findById(Objects.requireNonNull(employeeId))
                                .orElseThrow(() -> new RuntimeException("Employee not found"));
                if (isResigned(emp))
                        return List.of();

                return exceptionRepo.findByEmployeeIdAndDeletedAtIsNull(employeeId)
                                .stream().map(this::toResponse).toList();
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse create(Long employeeId, Long certificationRuleId, String notes) {
                var employee = employeeRepo.findById(Objects.requireNonNull(employeeId))
                                .orElseThrow(() -> new RuntimeException("Employee not found"));
                if (isResigned(employee))
                        throw new RuntimeException("Tidak bisa membuat exception untuk pegawai RESIGN/non-aktif");

                var rule = ruleRepo.findById(Objects.requireNonNull(certificationRuleId))
                                .orElseThrow(() -> new RuntimeException("Certification rule not found"));

                exceptionRepo.findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(employeeId,
                                certificationRuleId)
                                .ifPresent(e -> {
                                        throw new RuntimeException("Exception already exists and active");
                                });

                EmployeeEligibilityException softDeleted = exceptionRepo
                                .findFirstByEmployeeIdAndCertificationRuleId(employeeId, certificationRuleId)
                                .orElse(null);

                EmployeeEligibilityException saved;
                if (softDeleted != null && softDeleted.getDeletedAt() != null) {
                        softDeleted.setDeletedAt(null);
                        softDeleted.setIsActive(true);
                        softDeleted.setNotes(notes);
                        softDeleted.setUpdatedAt(Instant.now());
                        saved = exceptionRepo.save(softDeleted);
                } else {
                        EmployeeEligibilityException exception = EmployeeEligibilityException.builder()
                                        .employee(employee)
                                        .certificationRule(rule)
                                        .isActive(true)
                                        .notes(notes)
                                        .createdAt(Instant.now())
                                        .updatedAt(Instant.now())
                                        .build();
                        saved = exceptionRepo.save(Objects.requireNonNull(exception));
                }

                eligibilityService.refreshEligibilityForEmployee(employeeId);
                return toResponse(saved);
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse updateNotes(Long id, String notes) {
                var exception = exceptionRepo.findById(Objects.requireNonNull(id))
                                .orElseThrow(() -> new RuntimeException("Exception not found"));
                exception.setNotes(notes);
                exception.setUpdatedAt(Instant.now());
                return toResponse(exceptionRepo.save(exception));
        }

        @Transactional
        public EmployeeEligibilityExceptionResponse toggleActive(Long id) {
                var exception = exceptionRepo.findById(Objects.requireNonNull(id))
                                .orElseThrow(() -> new RuntimeException("Exception not found"));

                if (!Boolean.TRUE.equals(exception.getIsActive())) {
                        var emp = exception.getEmployee();
                        if (isResigned(emp))
                                throw new RuntimeException(
                                                "Tidak bisa mengaktifkan exception untuk pegawai RESIGN/non-aktif");
                }

                exception.setIsActive(!Boolean.TRUE.equals(exception.getIsActive()));
                exception.setUpdatedAt(Instant.now());

                EmployeeEligibilityException saved = exceptionRepo.save(exception);
                eligibilityService.refreshEligibilityForEmployee(saved.getEmployee().getId());
                return toResponse(saved);
        }

        @Transactional
        public void softDelete(Long id) {
                var exception = exceptionRepo.findById(Objects.requireNonNull(id))
                                .orElseThrow(() -> new RuntimeException("Exception not found"));
                exception.setIsActive(false);
                exception.setDeletedAt(Instant.now());
                exception.setUpdatedAt(Instant.now());
                EmployeeEligibilityException saved = exceptionRepo.save(exception);

                eligibilityService.refreshEligibilityForEmployee(saved.getEmployee().getId());
        }

        private boolean isResigned(com.bankmega.certification.entity.Employee e) {
                if (e == null)
                        return true;
                if (e.getDeletedAt() != null)
                        return true;
                String st = e.getStatus();
                return st != null && "RESIGN".equalsIgnoreCase(st.trim());
        }
}
