package com.bankmega.certification.controller;

import com.bankmega.certification.dto.NotificationTemplateRequest;
import com.bankmega.certification.dto.NotificationTemplateResponse;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.service.NotificationTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/notification-templates")
@RequiredArgsConstructor
public class NotificationTemplateController {

    private final NotificationTemplateService service;

    // ================== GET ALL ==================
    @GetMapping
    public List<NotificationTemplateResponse> getAllTemplates() {
        return service.getAllTemplates()
                .stream()
                .map(t -> new NotificationTemplateResponse(
                        t.getId(),
                        t.getCode(),
                        t.getTitle(),
                        t.getBody(),
                        t.getUpdatedBy(),
                        t.getUpdatedAt()))
                .toList();
    }

    // ================== GET BY CODE ==================
    @GetMapping("/{code}")
    public NotificationTemplateResponse getTemplateByCode(@PathVariable NotificationTemplate.Code code) {
        NotificationTemplate t = service.getTemplateByCode(code);
        return new NotificationTemplateResponse(
                t.getId(),
                t.getCode(),
                t.getTitle(),
                t.getBody(),
                t.getUpdatedBy(),
                t.getUpdatedAt());
    }

    // ================== UPDATE ==================
    @PutMapping("/{id}")
    public NotificationTemplateResponse updateTemplate(
            @PathVariable Long id,
            @RequestBody NotificationTemplateRequest req) {
        NotificationTemplate updated = service.updateTemplate(
                id,
                req.getTitle(),
                req.getBody(),
                req.getUpdatedBy());

        return new NotificationTemplateResponse(
                updated.getId(),
                updated.getCode(),
                updated.getTitle(),
                updated.getBody(),
                updated.getUpdatedBy(),
                updated.getUpdatedAt());
    }

    // ================== PREVIEW TEMPLATE (untuk testing FE) ==================
    @GetMapping("/{code}/preview")
    public ResponseEntity<String> previewTemplate(@PathVariable NotificationTemplate.Code code) {
        Employee dummy = Employee.builder()
                .name("Purbaya Yudhi Sadewa")
                .gender("M")
                .email("purbaya@bankmega.com")
                .build();

        String message = service.generateMessage(
                code,
                dummy,
                "SMR Jenjang 7",
                LocalDate.of(2025, 12, 31),
                "SMR-7-DES-2025",
                LocalDate.of(2025, 12, 1));

        return ResponseEntity.ok(message);
    }
}
