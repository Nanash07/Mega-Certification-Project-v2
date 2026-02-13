// src/main/java/com/bankmega/certification/controller/EmployeeHistoryController.java
package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeHistoryResponse;
import com.bankmega.certification.service.EmployeeHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/employee-histories")
@RequiredArgsConstructor
public class EmployeeHistoryController {

        private final EmployeeHistoryService historyService;

        @GetMapping
        public ResponseEntity<Page<EmployeeHistoryResponse>> getHistories(
                        @RequestParam(required = false) Long employeeId,
                        @RequestParam(defaultValue = "all") String actionType,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        @RequestParam(defaultValue = "ALL") String positionType, // NEW
                        @RequestParam(defaultValue = "0") int page,
                        @RequestParam(defaultValue = "10") int size) {

                Pageable pageable = PageRequest.of(page, size);

                return ResponseEntity.ok(historyService.getPagedHistory(
                                employeeId,
                                actionType,
                                search,
                                startDate,
                                endDate,
                                positionType, // NEW
                                pageable));
        }

        @GetMapping("/export")
        public ResponseEntity<byte[]> exportExcel(
                        @RequestParam(required = false) Long employeeId,
                        @RequestParam(defaultValue = "all") String actionType,
                        @RequestParam(required = false) String search,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
                        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
                        @RequestParam(defaultValue = "ALL") String positionType) {

                byte[] file = historyService.exportExcel(employeeId, actionType, search, startDate, endDate,
                                positionType);

                ZoneId wib = ZoneId.of("Asia/Jakarta");
                String ts = ZonedDateTime.now(wib).format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
                String filename = "employee_histories_" + ts + ".xlsx";

                return ResponseEntity.ok()
                                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                                .contentType(MediaType.parseMediaType(
                                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                                .body(file);
        }
}
