// src/main/java/com/bankmega/certification/service/EmployeeHistoryService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeHistoryResponse;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeHistory;
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
                        EmployeeHistory.EmployeeActionType actionType) {
                if (emp == null)
                        return;

                EmployeeHistory history = EmployeeHistory.builder()
                                .employee(emp)
                                .employeeNip(emp.getNip())
                                .employeeName(emp.getName())
                                .oldJobPosition(oldJob)
                                .oldJobTitle(oldJob != null ? oldJob.getName() : null)
                                .oldUnitName(emp.getUnit() != null ? emp.getUnit().getName() : null)
                                .oldDivisionName(emp.getDivision() != null ? emp.getDivision().getName() : null)
                                .oldRegionalName(emp.getRegional() != null ? emp.getRegional().getName() : null)
                                .newJobPosition(newJob)
                                .newJobTitle(newJob != null ? newJob.getName() : null)
                                .newUnitName(emp.getUnit() != null ? emp.getUnit().getName() : null)
                                .newDivisionName(emp.getDivision() != null ? emp.getDivision().getName() : null)
                                .newRegionalName(emp.getRegional() != null ? emp.getRegional().getName() : null)
                                .effectiveDate(effective != null ? effective : emp.getEffectiveDate())
                                .actionType(actionType)
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
                        LocalDate effective) {

                if (newEmp == null)
                        return;

                JobPosition newJob = newEmp.getJobPosition();

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
                                .newUnitName(newEmp.getUnit() != null ? newEmp.getUnit().getName() : null)
                                .newDivisionName(newEmp.getDivision() != null ? newEmp.getDivision().getName() : null)
                                .newRegionalName(newEmp.getRegional() != null ? newEmp.getRegional().getName() : null)
                                .effectiveDate(effective != null ? effective : newEmp.getEffectiveDate())
                                .actionType(actionType)
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

        public void snapshot(Employee emp, EmployeeHistory.EmployeeActionType actionType, LocalDate effectiveDate) {
                snapshot(emp, emp.getJobPosition(), emp.getJobPosition(), effectiveDate, actionType);
        }

        public void snapshot(Employee emp, EmployeeHistory.EmployeeActionType actionType) {
                snapshot(emp, emp.getJobPosition(), emp.getJobPosition(), emp.getEffectiveDate(), actionType);
        }

        @Transactional(readOnly = true)
        public Page<EmployeeHistoryResponse> getPagedHistory(
                        Long employeeId, String actionType, String search, Pageable pageable) {

                return getPagedHistory(employeeId, actionType, search, null, null, pageable);
        }

        @Transactional(readOnly = true)
        public Page<EmployeeHistoryResponse> getPagedHistory(
                        Long employeeId,
                        String actionType,
                        String search,
                        LocalDate startDate,
                        LocalDate endDate,
                        Pageable pageable) {

                Specification<EmployeeHistory> spec = EmployeeHistorySpecification.byEmployeeId(employeeId)
                                .and(EmployeeHistorySpecification.byActionType(actionType))
                                .and(EmployeeHistorySpecification.bySearch(search))
                                .and(EmployeeHistorySpecification.byDateRange(startDate, endDate));

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
                        LocalDate endDate) {

                Specification<EmployeeHistory> spec = EmployeeHistorySpecification.byEmployeeId(employeeId)
                                .and(EmployeeHistorySpecification.byActionType(actionType))
                                .and(EmployeeHistorySpecification.bySearch(search))
                                .and(EmployeeHistorySpecification.byDateRange(startDate, endDate));

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
                                        "Tanggal Efektif (WIB)"
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
                                .actionAt(h.getActionAt())
                                .build();
        }
}
