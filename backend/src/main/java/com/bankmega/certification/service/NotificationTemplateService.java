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
import java.time.temporal.TemporalAccessor;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTemplateService {

    private final NotificationTemplateRepository repository;

    private static final Locale ID_LOCALE = Locale.forLanguageTag("id-ID");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("d MMMM yyyy", ID_LOCALE);

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
        NotificationTemplate template = repository.findById(java.util.Objects.requireNonNull(id))
                .orElseThrow(() -> new NotFoundException("Template tidak ditemukan dengan ID: " + id));

        log.info("✏️ Update template {} oleh {}", template.getCode(), updatedBy);

        if (title != null && !title.trim().isEmpty()) {
            template.setTitle(title.trim());
        }
        if (body != null && !body.trim().isEmpty()) {
            template.setBody(body.trim());
        }

        // Validasi agar tidak kosong
        if (template.getTitle() == null || template.getTitle().isBlank()) {
            throw new IllegalArgumentException("Judul template tidak boleh kosong");
        }
        if (template.getBody() == null || template.getBody().isBlank()) {
            throw new IllegalArgumentException("Isi template tidak boleh kosong");
        }

        template.setUpdatedBy(updatedBy);
        template.setUpdatedAt(LocalDateTime.now());
        NotificationTemplate updated = repository.save(template);

        log.info("Template {} berhasil diupdate", template.getCode());
        return updated;
    }

    // ================== GENERATE (TITLE/BODY) ==================
    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
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

    @Transactional(readOnly = true)
    public String generateTitle(
            NotificationTemplate.Code code,
            Employee employee,
            Map<String, Object> extras) {
        NotificationTemplate template = getTemplateByCode(code);
        return renderWithExtras(template.getTitle(), employee, extras);
    }

    @Transactional(readOnly = true)
    public String generateMessage(
            NotificationTemplate.Code code,
            Employee employee,
            Map<String, Object> extras) {
        NotificationTemplate template = getTemplateByCode(code);
        return renderWithExtras(template.getBody(), employee, extras);
    }

    // ================== VARIABLE REPLACEMENT ==================
    private String replaceVariables(
            String text,
            Employee employee,
            String namaSertifikasi,
            LocalDate berlakuSampai,
            String namaBatch,
            LocalDate mulaiTanggal) {
        if (isBlank(text))
            return "-";

        Map<String, String> baseVars = new LinkedHashMap<>();
        baseVars.put("{{sapaan}}", getSapaan(employee));
        baseVars.put("{{nama}}", safe(employee != null ? employee.getName() : null));
        baseVars.put("{{namaSertifikasi}}", safe(namaSertifikasi));
        baseVars.put("{{berlakuSampai}}", formatTanggal(berlakuSampai));
        baseVars.put("{{namaBatch}}", safe(namaBatch));
        baseVars.put("{{mulaiTanggal}}", formatTanggal(mulaiTanggal));

        String result = applyVariables(text, baseVars);

        log.debug("🧩 Template processed: {}", result);
        return result;
    }

    private String renderWithExtras(String text, Employee employee, Map<String, Object> extras) {
        if (isBlank(text))
            return "-";

        // Variabel dasar tetap tersedia
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("{{sapaan}}", getSapaan(employee));
        vars.put("{{nama}}", safe(employee != null ? employee.getName() : null));

        // Tambahan dari extras (boleh LocalDate/LocalDateTime/String/Number)
        if (extras != null && !extras.isEmpty()) {
            for (Map.Entry<String, Object> e : extras.entrySet()) {
                String key = e.getKey();
                Object val = e.getValue();
                vars.put(key, stringify(val));
            }
        }

        String result = applyVariables(text, vars);
        log.debug("🧩 Template processed (extras): {}", result);
        return result;
    }

    private String applyVariables(String template, Map<String, String> vars) {
        String result = template;
        for (var entry : vars.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        return result;
    }

    // ================== UTIL ==================
    private String getSapaan(Employee employee) {
        if (employee == null || isBlank(employee.getGender())) {
            return "Bapak/Ibu";
        }
        return switch (employee.getGender().trim().toUpperCase()) {
            case "M" -> "Bapak";
            case "F" -> "Ibu";
            default -> "Bapak/Ibu";
        };
    }

    private String formatTanggal(TemporalAccessor tanggal) {
        try {
            if (tanggal == null)
                return "-";
            if (tanggal instanceof LocalDate ld)
                return ld.format(DATE_FORMATTER);
            if (tanggal instanceof LocalDateTime ldt)
                return ldt.toLocalDate().format(DATE_FORMATTER);
            // Fallback: coba cast ke LocalDate
            return DATE_FORMATTER.format(tanggal);
        } catch (Exception e) {
            log.warn("⚠️ Gagal format tanggal: {}", e.getMessage());
            return "-";
        }
    }

    private String stringify(Object val) {
        if (val == null)
            return "-";
        if (val instanceof TemporalAccessor ta)
            return formatTanggal(ta);
        return String.valueOf(val);
    }

    private String safe(String val) {
        return (!isBlank(val)) ? val : "-";
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
