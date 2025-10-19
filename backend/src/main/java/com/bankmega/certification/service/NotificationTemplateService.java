package com.bankmega.certification.service;

import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTemplateService {

    private final NotificationTemplateRepository repository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("d MMMM yyyy",
            new Locale("id", "ID"));

    // ================== LIST ==================
    @Transactional(readOnly = true)
    public List<NotificationTemplate> getAllTemplates() {
        log.info("📄 Mengambil semua template notifikasi...");
        return repository.findAll(Sort.by(Sort.Order.asc("code")));
    }

    // ================== GET BY CODE ==================
    @Transactional(readOnly = true)
    public NotificationTemplate getTemplateByCode(NotificationTemplate.Code code) {
        log.info("🔍 Mengambil template dengan code {}", code);
        return repository.findByCode(code)
                .orElseThrow(() -> new NotFoundException("Template notifikasi tidak ditemukan untuk kode: " + code));
    }

    // ================== UPDATE TEMPLATE ==================
    @Transactional
    public NotificationTemplate updateTemplate(Long id, String title, String body, String updatedBy) {
        NotificationTemplate template = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Template tidak ditemukan dengan ID: " + id));

        log.info("✏️ Update template {} oleh {}", template.getCode(), updatedBy);

        if (title != null && !title.trim().isEmpty()) {
            template.setTitle(title.trim());
        }
        if (body != null && !body.trim().isEmpty()) {
            template.setBody(body.trim());
        }

        // Validasi biar gak kosong
        if (template.getTitle() == null || template.getTitle().isBlank()) {
            throw new IllegalArgumentException("Judul template tidak boleh kosong");
        }
        if (template.getBody() == null || template.getBody().isBlank()) {
            throw new IllegalArgumentException("Isi template tidak boleh kosong");
        }

        template.setUpdatedBy(updatedBy);
        template.setUpdatedAt(LocalDateTime.now());
        NotificationTemplate updated = repository.save(template);

        log.info("✅ Template {} berhasil diupdate", template.getCode());
        return updated;
    }

    // ================== GENERATE TITLE ==================
    public String generateTitle(
            NotificationTemplate.Code code,
            Employee employee,
            String namaSertifikasi,
            LocalDate berlakuSampai,
            String namaBatch,
            LocalDate mulaiTanggal) {
        NotificationTemplate template = getTemplateByCode(code);
        return replaceVariables(template.getTitle(), employee, namaSertifikasi, berlakuSampai, namaBatch, mulaiTanggal);
    }

    // ================== GENERATE BODY ==================
    public String generateMessage(
            NotificationTemplate.Code code,
            Employee employee,
            String namaSertifikasi,
            LocalDate berlakuSampai,
            String namaBatch,
            LocalDate mulaiTanggal) {
        NotificationTemplate template = getTemplateByCode(code);
        return replaceVariables(template.getBody(), employee, namaSertifikasi, berlakuSampai, namaBatch, mulaiTanggal);
    }

    // ================== VARIABLE REPLACEMENT ==================
    private String replaceVariables(
            String text,
            Employee employee,
            String namaSertifikasi,
            LocalDate berlakuSampai,
            String namaBatch,
            LocalDate mulaiTanggal) {

        if (text == null || text.isBlank())
            return "-";

        String result = text;

        Map<String, String> variables = Map.ofEntries(
                Map.entry("{{sapaan}}", getSapaan(employee)),
                Map.entry("{{nama}}", safe(employee != null ? employee.getName() : null)),
                Map.entry("{{namaSertifikasi}}", safe(namaSertifikasi)),
                Map.entry("{{berlakuSampai}}", formatTanggal(berlakuSampai)),
                Map.entry("{{namaBatch}}", safe(namaBatch)),
                Map.entry("{{mulaiTanggal}}", formatTanggal(mulaiTanggal)));

        for (var entry : variables.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }

        log.debug("🧩 Template processed: {}", result);
        return result;
    }

    // ================== UTIL ==================
    private String getSapaan(Employee employee) {
        if (employee == null || employee.getGender() == null || employee.getGender().isBlank()) {
            return "Bapak/Ibu";
        }

        return switch (employee.getGender().trim().toUpperCase()) {
            case "M" -> "Bapak";
            case "F" -> "Ibu";
            default -> "Bapak/Ibu";
        };
    }

    private String formatTanggal(LocalDate tanggal) {
        try {
            return tanggal != null ? tanggal.format(DATE_FORMATTER) : "-";
        } catch (Exception e) {
            log.warn("⚠️ Gagal format tanggal: {}", e.getMessage());
            return "-";
        }
    }

    private String safe(String val) {
        return (val != null && !val.isBlank()) ? val : "-";
    }
}
