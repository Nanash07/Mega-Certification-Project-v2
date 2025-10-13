package com.bankmega.certification.service.employee_import;

import com.bankmega.certification.dto.EmployeeImportLogResponse;
import com.bankmega.certification.entity.EmployeeImportLog;
import com.bankmega.certification.repository.EmployeeImportLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EmployeeImportLogService {

    private final EmployeeImportLogRepository logRepo;

    public List<EmployeeImportLogResponse> getAllLogs() {
        return logRepo.findAll().stream()
                .map(this::toResponse)
                .sorted(Comparator.comparing(EmployeeImportLogResponse::getCreatedAt).reversed())
                .toList();
    }

    public List<EmployeeImportLogResponse> getLogsByUser(Long userId) {
        return logRepo.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    private EmployeeImportLogResponse toResponse(EmployeeImportLog log) {
        return EmployeeImportLogResponse.builder()
                .id(log.getId())
                .username(log.getUser() != null ? log.getUser().getUsername() : "-")
                .fileName(log.getFileName())
                .totalProcessed(log.getTotalProcessed())
                .totalCreated(log.getTotalCreated())
                .totalUpdated(log.getTotalUpdated())
                .totalMutated(log.getTotalMutated())
                .totalResigned(log.getTotalResigned())
                .totalErrors(log.getTotalErrors())
                .dryRun(log.isDryRun())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
