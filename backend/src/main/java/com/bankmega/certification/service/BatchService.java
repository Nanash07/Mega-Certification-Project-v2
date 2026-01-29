package com.bankmega.certification.service;

import com.bankmega.certification.dto.BatchRequest;
import com.bankmega.certification.dto.BatchResponse;
import com.bankmega.certification.dto.dashboard.MonthlyPoint;
import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.entity.Institution;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.BatchRepository;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeBatchRepository;
import com.bankmega.certification.repository.InstitutionRepository;
import com.bankmega.certification.specification.BatchSpecification;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Transactional
public class BatchService {

    private final BatchRepository batchRepository;
    private final CertificationRuleRepository certificationRuleRepository;
    private final InstitutionRepository institutionRepository;
    private final EmployeeBatchRepository employeeBatchRepository;

    public BatchResponse create(BatchRequest request, String createdBy) {
        Batch.BatchType type = request.getType() != null ? request.getType() : Batch.BatchType.CERTIFICATION;
        validateQuota(request.getQuota());
        validateDates(request.getStartDate(), request.getEndDate());
        validateRuleByType(type, request.getCertificationRuleId(), true);

        Batch batch = fromRequest(request, null);

        if (batch.getStatus() == null)
            batch.setStatus(Batch.Status.PLANNED);
        if (batch.getType() == null)
            batch.setType(Batch.BatchType.CERTIFICATION);

        batch.setCreatedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());

        return toResponse(batchRepository.save(batch));
    }

    public BatchResponse update(Long id, BatchRequest request, String updatedBy) {
        Batch existing = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));

        validateQuota(request.getQuota());
        validateDates(request.getStartDate(), request.getEndDate());

        Batch.BatchType targetType = request.getType() != null ? request.getType() : existing.getType();
        validateRuleByType(targetType, request.getCertificationRuleId(), false);

        if (request.getStatus() != null && !Objects.equals(existing.getStatus(), request.getStatus())) {
            validateBatchStatusTransition(existing.getStatus(), request.getStatus());
        }

        CertificationRule resolvedRule = resolveRuleForUpdate(targetType, existing, request.getCertificationRuleId());

        Institution institution = request.getInstitutionId() != null
                ? resolveInstitutionNullable(request.getInstitutionId())
                : existing.getInstitution();

        existing.setBatchName(request.getBatchName() != null ? request.getBatchName() : existing.getBatchName());
        existing.setCertificationRule(resolvedRule);
        existing.setInstitution(institution);
        existing.setStartDate(request.getStartDate() != null ? request.getStartDate() : existing.getStartDate());
        existing.setEndDate(request.getEndDate() != null ? request.getEndDate() : existing.getEndDate());
        existing.setQuota(request.getQuota() != null ? request.getQuota() : existing.getQuota());
        existing.setStatus(request.getStatus() != null ? request.getStatus() : existing.getStatus());
        existing.setType(targetType);
        existing.setUpdatedAt(Instant.now());

        return toResponse(batchRepository.save(existing));
    }

    @Transactional(readOnly = true)
    public BatchResponse getByIdResponse(Long id) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));
        return toResponse(batch);
    }

    public void delete(Long id, String deletedBy) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + id));
        batch.setDeletedAt(Instant.now());
        batch.setUpdatedAt(Instant.now());
        batchRepository.save(batch);
    }

    @Transactional(readOnly = true)
    public Page<BatchResponse> search(
            String search,
            Batch.Status status,
            Batch.BatchType type,
            Long certificationRuleId,
            Long institutionId,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            List<Long> allowedCertificationIds,
            Long employeeId,
            Pageable pageable) {

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.bySearch(search))
                .and(BatchSpecification.byStatus(status))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byCertificationRule(certificationRuleId))
                .and(BatchSpecification.byInstitution(institutionId))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    Sort.by(Sort.Order.desc("startDate"), Sort.Order.asc("batchName")));
        }

        return batchRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public byte[] exportParticipants(Long batchId) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found with id " + batchId));

        List<EmployeeBatch> participants = employeeBatchRepository
                .findWithEmployeeByBatch_IdAndDeletedAtIsNull(batchId);

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Peserta Batch");

            Font headerFont = wb.createFont();
            headerFont.setBold(true);

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle boldStyle = wb.createCellStyle();
            boldStyle.setFont(headerFont);

            DateTimeFormatter df = DateTimeFormatter.ofPattern("dd-MM-yyyy");

            // --- HEADER BATCH INFO ---
            int rowIdx = 0;

            Row rName = sheet.createRow(rowIdx++);
            rName.createCell(0).setCellValue("Nama Batch");
            rName.getCell(0).setCellStyle(boldStyle);
            rName.createCell(1).setCellValue(batch.getBatchName());

            Row rType = sheet.createRow(rowIdx++);
            rType.createCell(0).setCellValue("Jenis");
            rType.getCell(0).setCellStyle(boldStyle);
            rType.createCell(1).setCellValue(batch.getType() != null ? batch.getType().name() : "-");

            Row rStart = sheet.createRow(rowIdx++);
            rStart.createCell(0).setCellValue("Tanggal Mulai");
            rStart.getCell(0).setCellStyle(boldStyle);
            rStart.createCell(1).setCellValue(batch.getStartDate() != null ? df.format(batch.getStartDate()) : "-");

            Row rEnd = sheet.createRow(rowIdx++);
            rEnd.createCell(0).setCellValue("Tanggal Selesai");
            rEnd.getCell(0).setCellStyle(boldStyle);
            rEnd.createCell(1).setCellValue(batch.getEndDate() != null ? df.format(batch.getEndDate()) : "-");

            Row rCert = sheet.createRow(rowIdx++);
            rCert.createCell(0).setCellValue("Sertifikasi");
            rCert.getCell(0).setCellStyle(boldStyle);

            String certInfo = "-";
            if (batch.getCertificationRule() != null) {
                var r = batch.getCertificationRule();
                var c = r.getCertification() != null ? r.getCertification().getCode() : "";
                var l = r.getCertificationLevel() != null ? "Jenjang " + r.getCertificationLevel().getLevel() : "";
                var s = r.getSubField() != null ? r.getSubField().getCode() : "";
                // Join non-empty
                certInfo = java.util.stream.Stream.of(c, l, s)
                        .filter(str -> str != null && !str.isEmpty())
                        .collect(Collectors.joining(" - "));
            }
            rCert.createCell(1).setCellValue(certInfo);

            Row rInst = sheet.createRow(rowIdx++);
            rInst.createCell(0).setCellValue("Lembaga");
            rInst.getCell(0).setCellStyle(boldStyle);
            rInst.createCell(1).setCellValue(batch.getInstitution() != null ? batch.getInstitution().getName() : "-");

            // Empty row
            rowIdx++;

            // --- TABLE HEADER ---
            Row tableHeader = sheet.createRow(rowIdx++);
            String[] headers = { "No", "NIP", "Nama Pegawai", "Regional", "Divisi", "Unit", "Jabatan", "Status" };
            for (int i = 0; i < headers.length; i++) {
                Cell c = tableHeader.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            // --- TABLE DATA ---
            int no = 1;
            for (EmployeeBatch eb : participants) {
                Row row = sheet.createRow(rowIdx++);

                // No
                row.createCell(0).setCellValue(no++);

                var emp = eb.getEmployee();
                if (emp != null) {
                    // NIP
                    row.createCell(1).setCellValue(emp.getNip());
                    // Nama
                    row.createCell(2).setCellValue(emp.getName());

                    var pos = emp.getPrimaryPosition();
                    if (pos != null) {
                        row.createCell(3).setCellValue(pos.getRegional() != null ? pos.getRegional().getName() : "-");
                        row.createCell(4).setCellValue(pos.getDivision() != null ? pos.getDivision().getName() : "-");
                        row.createCell(5).setCellValue(pos.getUnit() != null ? pos.getUnit().getName() : "-");
                        row.createCell(6)
                                .setCellValue(pos.getJobPosition() != null ? pos.getJobPosition().getName() : "-");
                    } else {
                        row.createCell(3).setCellValue("-");
                        row.createCell(4).setCellValue("-");
                        row.createCell(5).setCellValue("-");
                        row.createCell(6).setCellValue("-");
                    }
                } else {
                    row.createCell(1).setCellValue("-");
                    row.createCell(2).setCellValue("-");
                    row.createCell(3).setCellValue("-");
                    row.createCell(4).setCellValue("-");
                    row.createCell(5).setCellValue("-");
                    row.createCell(6).setCellValue("-");
                }

                // Status
                row.createCell(7).setCellValue(eb.getStatus() != null ? eb.getStatus().name() : "-");
            }

            // Auto size
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to export participants", e);
        }
    }

    @Transactional(readOnly = true)
    public long countForDashboard(
            List<Batch.Status> statuses,
            Batch.BatchType type,
            Long certificationRuleId,
            Long institutionId,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            List<Long> allowedCertificationIds,
            Long employeeId) {

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.byStatuses(statuses))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byCertificationRule(certificationRuleId))
                .and(BatchSpecification.byInstitution(institutionId))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        return batchRepository.count(spec);
    }

    @Transactional(readOnly = true)
    public List<MonthlyPoint> monthlyBatchCount(
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            Batch.BatchType type,
            List<Long> allowedCertificationIds,
            Long employeeId) {

        List<Batch.Status> statuses = List.of(Batch.Status.ONGOING, Batch.Status.FINISHED);

        LocalDate effectiveStart = startDate;
        LocalDate effectiveEnd = endDate;

        if (effectiveStart == null && effectiveEnd == null) {
            int year = LocalDate.now().getYear();
            effectiveStart = LocalDate.of(year, 1, 1);
            effectiveEnd = LocalDate.of(year, 12, 31);
        } else if (effectiveStart != null && effectiveEnd == null) {
            effectiveEnd = LocalDate.of(effectiveStart.getYear(), 12, 31);
        } else if (effectiveStart == null) {
            effectiveStart = LocalDate.of(effectiveEnd.getYear(), 1, 1);
        }

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.byStatuses(statuses))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(effectiveStart, effectiveEnd));

        List<Batch> batches = batchRepository.findAll(spec);

        Map<Integer, Long> grouped = batches.stream()
                .filter(b -> b.getStartDate() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getStartDate().getMonthValue(),
                        Collectors.counting()));

        return IntStream.rangeClosed(1, 12)
                .mapToObj(m -> new MonthlyPoint(m, grouped.getOrDefault(m, 0L)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(
            String search,
            Batch.Status status,
            Batch.BatchType type,
            Long certificationRuleId,
            Long institutionId,
            Long regionalId,
            Long divisionId,
            Long unitId,
            Long certificationId,
            Long levelId,
            Long subFieldId,
            LocalDate startDate,
            LocalDate endDate,
            List<Long> allowedCertificationIds,
            Long employeeId) {

        Specification<Batch> spec = BatchSpecification.notDeleted()
                .and(BatchSpecification.bySearch(search))
                .and(BatchSpecification.byStatus(status))
                .and(BatchSpecification.byType(type))
                .and(BatchSpecification.byCertificationRule(certificationRuleId))
                .and(BatchSpecification.byInstitution(institutionId))
                .and(BatchSpecification.byOrgScope(regionalId, divisionId, unitId))
                .and(BatchSpecification.byCertification(certificationId))
                .and(BatchSpecification.byCertificationLevel(levelId))
                .and(BatchSpecification.bySubField(subFieldId))
                .and(BatchSpecification.byAllowedCertifications(allowedCertificationIds))
                .and(BatchSpecification.byEmployee(employeeId))
                .and(BatchSpecification.byDateRange(startDate, endDate));

        List<Batch> batches = batchRepository.findAll(
                spec,
                Sort.by(Sort.Order.desc("startDate"), Sort.Order.asc("batchName")));

        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Batches");
            DateTimeFormatter df = DateTimeFormatter.ISO_LOCAL_DATE;

            Font headerFont = wb.createFont();
            headerFont.setBold(true);

            CellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle textStyle = wb.createCellStyle();

            CellStyle numberStyle = wb.createCellStyle();
            numberStyle.setDataFormat(wb.createDataFormat().getFormat("0"));

            String[] headers = new String[] {
                    "ID",
                    "Nama Batch",
                    "Jenis",
                    "Status",
                    "Sertifikasi Code",
                    "Sertifikasi Name",
                    "Level",
                    "Subfield",
                    "Lembaga",
                    "Tanggal Mulai",
                    "Tanggal Selesai",
                    "Quota",
                    "Total Peserta",
                    "Total Lulus"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (Batch b : batches) {
                BatchResponse r = toResponse(b);
                Row row = sheet.createRow(rowIdx++);

                setCell(row, 0, r.getId(), numberStyle);
                setCell(row, 1, r.getBatchName(), textStyle);
                setCell(row, 2, r.getType() != null ? r.getType().name() : "", textStyle);
                setCell(row, 3, r.getStatus() != null ? r.getStatus().name() : "", textStyle);
                setCell(row, 4, r.getCertificationCode(), textStyle);
                setCell(row, 5, r.getCertificationName(), textStyle);
                setCell(row, 6, r.getCertificationLevelName(), textStyle);
                setCell(row, 7, r.getSubFieldCode(), textStyle);
                setCell(row, 8, r.getInstitutionName(), textStyle);
                setCell(row, 9, r.getStartDate() != null ? df.format(r.getStartDate()) : "", textStyle);
                setCell(row, 10, r.getEndDate() != null ? df.format(r.getEndDate()) : "", textStyle);
                setCell(row, 11, r.getQuota(), numberStyle);
                setCell(row, 12, r.getTotalParticipants(), numberStyle);
                setCell(row, 13, r.getTotalPassed(), numberStyle);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                int w = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(w + 512, 12000));
            }

            wb.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("Failed to export excel", e);
        }
    }

    private void setCell(Row row, int col, Object value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value == null) {
            cell.setCellValue("");
            cell.setCellStyle(style);
            return;
        }
        if (value instanceof Number n) {
            cell.setCellValue(n.doubleValue());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
        cell.setCellStyle(style);
    }

    private Batch fromRequest(BatchRequest request, Batch existingOrNull) {
        Batch.BatchType type = request.getType() != null
                ? request.getType()
                : (existingOrNull != null ? existingOrNull.getType() : Batch.BatchType.CERTIFICATION);

        CertificationRule rule = null;
        if (type == Batch.BatchType.CERTIFICATION || type == Batch.BatchType.EXTENSION) {
            rule = certificationRuleRepository.findById(Objects.requireNonNull(request.getCertificationRuleId()))
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        } else if (request.getCertificationRuleId() != null) {
            rule = certificationRuleRepository.findById(Objects.requireNonNull(request.getCertificationRuleId()))
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        }

        Institution institution = resolveInstitutionNullable(request.getInstitutionId());

        return Batch.builder()
                .batchName(request.getBatchName())
                .certificationRule(rule)
                .institution(institution)
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .quota(request.getQuota())
                .status(request.getStatus() != null ? request.getStatus() : Batch.Status.PLANNED)
                .type(type != null ? type : Batch.BatchType.CERTIFICATION)
                .build();
    }

    private BatchResponse toResponse(Batch b) {
        CertificationRule rule = b.getCertificationRule();

        long totalParticipants = (b.getId() == null) ? 0L
                : employeeBatchRepository.countByBatch_IdAndDeletedAtIsNull(b.getId());
        long totalPassed = (b.getId() == null) ? 0L
                : employeeBatchRepository.countByBatch_IdAndStatusAndDeletedAtIsNull(
                        b.getId(), EmployeeBatch.Status.PASSED);
        long totalFailed = (b.getId() == null) ? 0L
                : employeeBatchRepository.countByBatch_IdAndStatusAndDeletedAtIsNull(
                        b.getId(), EmployeeBatch.Status.FAILED);

        return BatchResponse.builder()
                .id(b.getId())
                .batchName(b.getBatchName())
                .type(b.getType())
                .status(b.getStatus())
                .certificationRuleId(rule != null ? rule.getId() : null)
                .certificationId(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getId() : null)
                .certificationName(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getName() : null)
                .certificationCode(
                        rule != null && rule.getCertification() != null ? rule.getCertification().getCode() : null)
                .certificationLevelId(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getId()
                                : null)
                .certificationLevelName(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getName()
                                : null)
                .certificationLevelLevel(
                        rule != null && rule.getCertificationLevel() != null ? rule.getCertificationLevel().getLevel()
                                : null)
                .subFieldId(rule != null && rule.getSubField() != null ? rule.getSubField().getId() : null)
                .subFieldName(rule != null && rule.getSubField() != null ? rule.getSubField().getName() : null)
                .subFieldCode(rule != null && rule.getSubField() != null ? rule.getSubField().getCode() : null)
                .validityMonths(rule != null ? rule.getValidityMonths() : null)
                .reminderMonths(rule != null ? rule.getReminderMonths() : null)
                .wajibSetelahMasuk(rule != null ? rule.getWajibSetelahMasuk() : null)
                .isActiveRule(rule != null ? rule.getIsActive() : null)
                .institutionId(b.getInstitution() != null ? b.getInstitution().getId() : null)
                .institutionName(b.getInstitution() != null ? b.getInstitution().getName() : null)
                .startDate(b.getStartDate())
                .endDate(b.getEndDate())
                .quota(b.getQuota())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .totalParticipants(totalParticipants)
                .totalPassed(totalPassed)
                .totalFailed(totalFailed)
                .build();
    }

    private void validateQuota(Integer quota) {
        if (quota == null)
            return;
        if (quota < 1)
            throw new IllegalArgumentException("Quota minimal 1 peserta");
        if (quota > 250)
            throw new IllegalArgumentException("Quota maksimal 250 peserta");
    }

    private void validateDates(LocalDate start, LocalDate end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new IllegalArgumentException("Tanggal selesai tidak boleh sebelum tanggal mulai");
        }
    }

    private void validateRuleByType(Batch.BatchType type, Long ruleId, boolean isCreate) {
        if (type == null)
            return;

        if ((type == Batch.BatchType.CERTIFICATION || type == Batch.BatchType.EXTENSION)
                && ruleId == null && isCreate) {
            throw new IllegalArgumentException("CertificationRule wajib diisi untuk batch tipe " + type.name());
        }
    }

    private void validateBatchStatusTransition(Batch.Status current, Batch.Status next) {
        if (next == null)
            throw new IllegalArgumentException("Status batch tidak boleh null");
    }

    private Institution resolveInstitutionNullable(Long institutionId) {
        if (institutionId == null)
            return null;
        return institutionRepository.findById(institutionId)
                .orElseThrow(() -> new NotFoundException("Institution not found"));
    }

    private CertificationRule resolveRuleForUpdate(Batch.BatchType targetType, Batch existing, Long requestedRuleId) {
        if (targetType == Batch.BatchType.CERTIFICATION || targetType == Batch.BatchType.EXTENSION) {
            Long ruleId = requestedRuleId != null
                    ? requestedRuleId
                    : (existing.getCertificationRule() != null ? existing.getCertificationRule().getId() : null);

            if (ruleId == null) {
                throw new IllegalArgumentException(
                        "CertificationRule wajib diisi untuk batch tipe " + targetType.name());
            }

            return certificationRuleRepository.findById(ruleId)
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        } else {
            if (requestedRuleId == null)
                return existing.getCertificationRule();
            return certificationRuleRepository.findById(requestedRuleId)
                    .orElseThrow(() -> new NotFoundException("CertificationRule not found"));
        }
    }
}
