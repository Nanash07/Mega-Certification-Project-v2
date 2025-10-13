package com.bankmega.certification.service;

import com.bankmega.certification.dto.*;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.service.employee_import.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeImportService {

    private final EmployeeImportProcessor processor;
    private final EmployeeImportLogService logService;
    private final EmployeeTemplateService templateService;

    public EmployeeImportResponse dryRun(MultipartFile file, User user) throws Exception {
        return processor.dryRun(file, user);
    }

    public EmployeeImportResponse confirm(MultipartFile file, User user) throws Exception {
        return processor.confirm(file, user);
    }

    public ResponseEntity<byte[]> downloadTemplate() {
        return templateService.downloadTemplate();
    }

    public List<EmployeeImportLogResponse> getAllLogs() {
        return logService.getAllLogs();
    }

    public List<EmployeeImportLogResponse> getLogsByUser(Long userId) {
        return logService.getLogsByUser(userId);
    }
}
