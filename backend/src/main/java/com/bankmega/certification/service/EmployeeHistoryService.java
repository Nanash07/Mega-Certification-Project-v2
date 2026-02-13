// src/main/java/com/bankmega/certification/service/EmployeeHistoryService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeHistoryResponse;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeHistory;
import com.bankmega.certification.entity.EmployeePosition;
import com.bankmega.certification.entity.JobPosition;
import com.bankmega.certification.repository.EmployeeHistoryRepository;
import com.bankmega.certification.specification.EmployeeHistorySpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeHistoryService {

        private final EmployeeHistoryRepository historyRepo;

        private final List<EmployeeHistory> batchBuffer = new ArrayList<>();
        private static final int BATCH_SIZE = 200;

        @Transactional
        public void snapshot(Employee emp,
                        JobPosition oldJob,
                        JobPosition newJob,
                        LocalDate effective,
                        EmployeeHistory.EmployeeActionType actionType,
                        String positionType) {
                if (emp == null)
                        return;

                EmployeePosition primary = emp.getPrimaryPosition();
                // Use passed jobs/orgs if available, otherwise fallback to existing primary
                // (for old logic)
                // Actually, if we are snapshotting a SPECIFIC position (e.g. secondary), we
                // should use the passed values.

                // For safety, if newJob/oldJob are passed, we rely on them.
                // Org units are a bit trickier because they are usually tied to position.
                // But here we only pass JobPosition.
                // We should probably rely on the caller to pass correct orgs if possible,
                // or fetch from the relevant position.

                // As a simplification for now, we'll assume orgs come from primary if not
                // provided
                // OR we should have passed them?
                // The original code fetched form primary.
                // If we want to support secondary, we must fetch from the CORRECT position.
                // But here we only have Employee and JobPosition.
                // Ideally we should pass the full snapshot data or the Position object.

                // Let's modify to use the VALUES from the relevant position if available?
                // Or stick to the original "snapshot" signatures?
                // To properly support splitting, we need the caller to provide details.
                // BUT, `snapshot` at line 37 is usually called for CREATED/RESIGN/TERMINATED of
                // EMPLOYEE.
                // In those cases, it's usually about the PRIMARY position or the whole
                // employee.
                // So default to "UTAMA" is fine for general employee events.

                String unitName = primary != null && primary.getUnit() != null
                                ? primary.getUnit().getName()
                                : null;
                String divisionName = primary != null && primary.getDivision() != null
                                ? primary.getDivision().getName()
                                : null;
                String regionalName = primary != null && primary.getRegional() != null
                                ? primary.getRegional().getName()
                                : null;
                LocalDate effDate = primary != null && primary.getEffectiveDate() != null
                                ? primary.getEffectiveDate()
                                : null;

                EmployeeHistory history = EmployeeHistory.builder()
                                .employee(emp)
                                .employeeNip(emp.getNip())
                                .employeeName(emp.getName())
                                .oldJobPosition(oldJob)
                                .oldJobTitle(oldJob != null ? oldJob.getName() : null)
                                .oldUnitName(unitName)
                                .oldDivisionName(divisionName)
                                .oldRegionalName(regionalName)
                                .newJobPosition(newJob)
                                .newJobTitle(newJob != null ? newJob.getName() : null)
                                .newUnitName(unitName)
                                .newDivisionName(divisionName)
                                .newRegionalName(regionalName)
                                .effectiveDate(effective != null ? effective : effDate)
                                .actionType(actionType)
                                .positionType(positionType != null ? positionType : "UTAMA")
                                .actionAt(Instant.now())
                                .build();

                batchBuffer.add(history);

                if (batchBuffer.size() >= BATCH_SIZE) {
                        flushBatch();
                }
        }

        @Transactional
        public void snapshotWithOldValues(
                        Employee newEmp,
                        String oldJobTitle,
                        String oldUnitName,
                        String oldDivisionName,
                        String oldRegionalName,
                        EmployeeHistory.EmployeeActionType actionType,
                        LocalDate effective,
                        String positionType) {

                if (newEmp == null)
                        return;

                // Determine which position to read new values from
                boolean isSecondary = "KEDUA".equalsIgnoreCase(positionType);
                EmployeePosition targetPos = isSecondary ? newEmp.getSecondaryPosition() : newEmp.getPrimaryPosition();

                JobPosition newJob = targetPos != null && targetPos.getJobPosition() != null
                                ? targetPos.getJobPosition()
                                : null;
                String newUnitName = targetPos != null && targetPos.getUnit() != null
                                ? targetPos.getUnit().getName()
                                : null;
                String newDivisionName = targetPos != null && targetPos.getDivision() != null
                                ? targetPos.getDivision().getName()
                                : null;
                String newRegionalName = targetPos != null && targetPos.getRegional() != null
                                ? targetPos.getRegional().getName()
                                : null;
                LocalDate effDate = targetPos != null && targetPos.getEffectiveDate() != null
                                ? targetPos.getEffectiveDate()
                                : null;

                EmployeeHistory history = EmployeeHistory.builder()
                                .employee(newEmp)
                                .employeeNip(newEmp.getNip())
                                .employeeName(newEmp.getName())
                                .oldJobTitle(oldJobTitle)
                                .oldUnitName(oldUnitName)
                                .oldDivisionName(oldDivisionName)
                                .oldRegionalName(oldRegionalName)
                                .newJobPosition(newJob)
                                .newJobTitle(newJob != null ? newJob.getName() : null)
                                .newUnitName(newUnitName)
                                .newDivisionName(newDivisionName)
                                .newRegionalName(newRegionalName)
                                .effectiveDate(effective != null ? effective : effDate)
                                .actionType(actionType)
                                .positionType(positionType != null ? positionType : "UTAMA")
                                .actionAt(Instant.now())
                                .build();

                batchBuffer.add(history);

                if (batchBuffer.size() >= BATCH_SIZE) {
                        flushBatch();
                }
        }

        @Transactional
        public void flushBatch() {
                if (batchBuffer.isEmpty())
                        return;
                try {
                        historyRepo.saveAll(java.util.Objects.requireNonNull(batchBuffer));
                        historyRepo.flush();
                        batchBuffer.clear();
                } catch (Exception e) {
                        log.error("Gagal batch insert history: {}", e.getMessage());
                }
        }

        public void snapshot(Employee emp, EmployeeHistory.EmployeeActionType actionType, LocalDate effectiveDate,
                        String positionType) {
                EmployeePosition primary = emp != null ? emp.getPrimaryPosition() : null;
                JobPosition jp = primary != null && primary.getJobPosition() != null
                                ? primary.getJobPosition()
                                : null;
                snapshot(emp, jp, jp, effectiveDate, actionType, positionType);
        }

        public void snapshot(Employee emp, EmployeeHistory.EmployeeActionType actionType) {
                snapshot(emp, actionType, null, "UTAMA");
        }

        @Transactional
        public void snapshotCreated(Employee emp, EmployeePosition pos, LocalDate effectiveDate, String positionType) {
                if (emp == null || pos == null)
                        return;

                String unitName = pos.getUnit() != null ? pos.getUnit().getName() : null;
                String divisionName = pos.getDivision() != null ? pos.getDivision().getName() : null;
                String regionalName = pos.getRegional() != null ? pos.getRegional().getName() : null;
                String jobName = pos.getJobPosition() != null ? pos.getJobPosition().getName() : null;

                EmployeeHistory history = EmployeeHistory.builder()
                                .employee(emp)
                                .employeeNip(emp.getNip())
                                .employeeName(emp.getName())
                                .oldJobPosition(null)
                                .oldJobTitle("-") // As requested
                                .oldUnitName("-")
                                .oldDivisionName("-")
                                .oldRegionalName("-")
                                .newJobPosition(pos.getJobPosition())
                                .newJobTitle(jobName)
                                .newUnitName(unitName)
                                .newDivisionName(divisionName)
                                .newRegionalName(regionalName)
                                .effectiveDate(effectiveDate != null ? effectiveDate
                                                : (pos.getEffectiveDate() != null ? pos.getEffectiveDate()
                                                                : LocalDate.now()))
                                .actionType(EmployeeHistory.EmployeeActionType.CREATED)
                                .positionType(positionType != null ? positionType : "UTAMA")
                                .actionAt(Instant.now())
                                .build();

                batchBuffer.add(history);

                if (batchBuffer.size() >= BATCH_SIZE) {
                        flushBatch();
                }
        }

        @Transactional(readOnly = true)
        public Page<EmployeeHistoryResponse> getPagedHistory(
                        Long employeeId, String actionType, String search, Pageable pageable) {

                return getPagedHistory(employeeId, actionType, search, null, null, null, pageable);
        }

        @Transactional(readOnly = true)
        public Page<EmployeeHistoryResponse> getPagedHistory(
                        Long employeeId,
                        String actionType,
                        String search,
                        LocalDate startDate,
                        LocalDate endDate,
                        String positionType,
                        Pageable pageable) {

                Specification<EmployeeHistory> spec = EmployeeHistorySpecification.byEmployeeId(employeeId)
                                .and(EmployeeHistorySpecification.byActionType(actionType))
                                .and(EmployeeHistorySpecification.bySearch(search))
                                .and(EmployeeHistorySpecification.byDateRange(startDate, endDate))
                                .and(EmployeeHistorySpecification.byPositionType(positionType)); // NEW

                Pageable sorted = PageRequest.of(
                                pageable.getPageNumber(),
                                pageable.getPageSize(),
                                Sort.by(Sort.Direction.DESC, "actionAt"));

                return historyRepo.findAll(spec, sorted).map(this::toResponse);
        }

        @Transactional(readOnly = true)
        public byte[] exportExcel(
                        Long employeeId,
                        String actionType,
                        String search,
                        LocalDate startDate,
                        LocalDate endDate,
                        String positionType) { // NEW

                Specification<EmployeeHistory> spec = EmployeeHistorySpecification.byEmployeeId(employeeId)
                                .and(EmployeeHistorySpecification.byActionType(actionType))
                                .and(EmployeeHistorySpecification.bySearch(search))
                                .and(EmployeeHistorySpecification.byDateRange(startDate, endDate))
                                .and(EmployeeHistorySpecification.byPositionType(positionType)); // NEW

                List<EmployeeHistory> rows = historyRepo.findAll(spec, Sort.by(Sort.Direction.DESC, "actionAt"));

                ZoneId wib = ZoneId.of("Asia/Jakarta");

                try (Workbook wb = new XSSFWorkbook()) {
                        Sheet sheet = wb.createSheet("Employee History");

                        CellStyle headerStyle = wb.createCellStyle();
                        Font headerFont = wb.createFont();
                        headerFont.setBold(true);
                        headerStyle.setFont(headerFont);

                        CellStyle dateStyle = wb.createCellStyle();
                        short dFmt = wb.getCreationHelper().createDataFormat().getFormat("dd-mmm-yyyy");
                        dateStyle.setDataFormat(dFmt);

                        String[] headers = {
                                        "No",
                                        "NIP",
                                        "Nama Pegawai",
                                        "Aksi",
                                        "Tanggal Aksi (WIB)",
                                        "Jabatan Lama",
                                        "Jabatan Baru",
                                        "Unit Lama",
                                        "Unit Baru",
                                        "Divisi Lama",
                                        "Divisi Baru",
                                        "Regional Lama",
                                        "Regional Baru",
                                        "Tanggal Efektif (WIB)",
                                        "Tipe"
                        };

                        Row headerRow = sheet.createRow(0);
                        for (int i = 0; i < headers.length; i++) {
                                Cell cell = headerRow.createCell(i);
                                cell.setCellValue(headers[i]);
                                cell.setCellStyle(headerStyle);
                        }

                        int rowIdx = 1;
                        for (EmployeeHistory h : rows) {
                                Row row = sheet.createRow(rowIdx);
                                int col = 0;

                                row.createCell(col++).setCellValue(rowIdx);
                                row.createCell(col++).setCellValue(nvl(h.getEmployeeNip()));
                                row.createCell(col++).setCellValue(nvl(h.getEmployeeName()));
                                row.createCell(col++).setCellValue(nvl(h.getActionType()));

                                Cell actionAtCell = row.createCell(col++);
                                if (h.getActionAt() != null) {
                                        Instant instant = h.getActionAt().atZone(wib).toInstant();
                                        actionAtCell.setCellValue(Date.from(instant));
                                        actionAtCell.setCellStyle(dateStyle);
                                } else {
                                        actionAtCell.setCellValue("");
                                }

                                row.createCell(col++).setCellValue(nvl(h.getOldJobTitle()));
                                row.createCell(col++).setCellValue(nvl(h.getNewJobTitle()));

                                row.createCell(col++).setCellValue(nvl(h.getOldUnitName()));
                                row.createCell(col++).setCellValue(nvl(h.getNewUnitName()));

                                row.createCell(col++).setCellValue(nvl(h.getOldDivisionName()));
                                row.createCell(col++).setCellValue(nvl(h.getNewDivisionName()));

                                row.createCell(col++).setCellValue(nvl(h.getOldRegionalName()));
                                row.createCell(col++).setCellValue(nvl(h.getNewRegionalName()));

                                Cell effCell = row.createCell(col++);
                                if (h.getEffectiveDate() != null) {
                                        Instant effInstant = h.getEffectiveDate().atStartOfDay(wib).toInstant();
                                        effCell.setCellValue(Date.from(effInstant));
                                        effCell.setCellStyle(dateStyle);
                                } else {
                                        effCell.setCellValue("");
                                }

                                row.createCell(col++).setCellValue(nvl(h.getPositionType()));

                                rowIdx++;
                        }

                        for (int i = 0; i < headers.length; i++) {
                                sheet.autoSizeColumn(i);
                        }

                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        wb.write(out);
                        return out.toByteArray();

                } catch (Exception e) {
                        throw new RuntimeException("Gagal export Excel employee history", e);
                }
        }

        private String nvl(Object v) {
                return v == null ? "" : v.toString();
        }

        private EmployeeHistoryResponse toResponse(EmployeeHistory h) {
                return EmployeeHistoryResponse.builder()
                                .id(h.getId())
                                .employeeId(h.getEmployee() != null ? h.getEmployee().getId() : null)
                                .employeeNip(h.getEmployeeNip())
                                .employeeName(h.getEmployeeName())
                                .oldJobTitle(h.getOldJobTitle())
                                .oldUnitName(h.getOldUnitName())
                                .oldDivisionName(h.getOldDivisionName())
                                .oldRegionalName(h.getOldRegionalName())
                                .newJobTitle(h.getNewJobTitle())
                                .newUnitName(h.getNewUnitName())
                                .newDivisionName(h.getNewDivisionName())
                                .newRegionalName(h.getNewRegionalName())
                                .effectiveDate(h.getEffectiveDate())
                                .actionType(h.getActionType())
                                .positionType(h.getPositionType())
                                .actionAt(h.getActionAt())
                                .build();
        }
}
