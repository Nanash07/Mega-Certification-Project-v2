package com.bankmega.certification.service.employee_import;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;

@Service
public class EmployeeTemplateService {

    public ResponseEntity<byte[]> downloadTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Employees");
            Row header = sheet.createRow(0);
            String[] cols = {
                    "Regional", "Division", "Unit", "JobTitle",
                    "NIP", "Name", "Gender", "Email", "EffectiveDate (yyyy-MM-dd)",
                    "Regional2", "Division2", "Unit2", "JobTitle2", "EffectiveDate2 (yyyy-MM-dd)"
            };
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            workbook.write(bos);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=employee_template.xlsx")
                    .contentType(java.util.Objects.requireNonNull(MediaType.APPLICATION_OCTET_STREAM))
                    .body(bos.toByteArray());
        } catch (Exception e) {
            throw new RuntimeException("Gagal membuat template: " + e.getMessage(), e);
        }
    }
}
