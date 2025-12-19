package com.bankmega.certification.controller;

import com.bankmega.certification.dto.EmployeeCertificationRequest;
import com.bankmega.certification.dto.EmployeeCertificationResponse;
import com.bankmega.certification.service.EmployeeCertificationHistoryService;
import com.bankmega.certification.service.EmployeeCertificationService;
import com.bankmega.certification.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/employee-certifications")
@RequiredArgsConstructor
public class EmployeeCertificationController {

    private final EmployeeCertificationService service;
    private final FileStorageService fileStorageService;
    private final EmployeeCertificationHistoryService historyService;

    @GetMapping
    public Page<EmployeeCertificationResponse> getPagedFiltered(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<Long> institutionIds,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateEnd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilEnd,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        String[] sortParams = sort.split(",");
        Sort.Direction direction = sortParams.length > 1 && sortParams[1].equalsIgnoreCase("asc")
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortParams[0]));

        return service.getPagedFiltered(
                employeeIds,
                certCodes,
                levels,
                subCodes,
                institutionIds,
                statuses,
                search,
                certDateStart,
                certDateEnd,
                validUntilStart,
                validUntilEnd,
                pageable);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) List<Long> employeeIds,
            @RequestParam(required = false) List<String> certCodes,
            @RequestParam(required = false) List<Integer> levels,
            @RequestParam(required = false) List<String> subCodes,
            @RequestParam(required = false) List<Long> institutionIds,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate certDateEnd,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilStart,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validUntilEnd) {

        byte[] bytes = service.exportExcel(
                employeeIds,
                certCodes,
                levels,
                subCodes,
                institutionIds,
                statuses,
                search,
                certDateStart,
                certDateEnd,
                validUntilStart,
                validUntilEnd);

        String today = LocalDate.now().format(DateTimeFormatter.ISO_DATE);
        String filename = "employee-certifications-" + today + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename)
                        .build().toString())
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }

    @GetMapping("/{id}")
    public EmployeeCertificationResponse getDetail(@PathVariable Long id) {
        return service.getDetail(id);
    }

    @PostMapping
    public EmployeeCertificationResponse create(@RequestBody EmployeeCertificationRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public EmployeeCertificationResponse update(
            @PathVariable Long id,
            @RequestBody EmployeeCertificationRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDelete(@PathVariable Long id) {
        service.softDelete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/upload")
    public EmployeeCertificationResponse uploadCertificate(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tidak boleh kosong");
        }
        return service.uploadCertificate(id, file);
    }

    @PostMapping("/{id}/reupload")
    public EmployeeCertificationResponse reuploadCertificate(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File tidak boleh kosong");
        }
        return service.reuploadCertificate(id, file);
    }

    @DeleteMapping("/{id}/certificate")
    public ResponseEntity<Void> deleteCertificate(@PathVariable Long id) {
        service.deleteCertificate(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> getCertificateFile(
            @PathVariable Long id,
            @RequestParam(value = "download", defaultValue = "false") boolean download) {
        return fileStorageService.serveFile(id, download);
    }
}
