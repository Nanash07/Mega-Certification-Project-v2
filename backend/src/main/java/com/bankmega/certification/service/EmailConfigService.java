package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmailConfigRequestDTO;
import com.bankmega.certification.dto.EmailConfigResponseDTO;
import com.bankmega.certification.entity.EmailConfig;
import com.bankmega.certification.repository.EmailConfigRepository;
import com.bankmega.certification.security.AESUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.internet.MimeMessage;
import java.util.List;
import java.util.Objects;
import java.util.Properties;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailConfigService {

    private final EmailConfigRepository repository;

    /** Ambil konfigurasi email aktif (DTO) */
    public EmailConfigResponseDTO getActiveConfig() {
        EmailConfig config = getActiveConfigEntity();
        return mapToResponse(config);
    }

    /** Ambil konfigurasi email aktif (Entity) */
    public EmailConfig getActiveConfigEntity() {
        return repository.findByActiveTrue()
                .orElseThrow(() -> new RuntimeException("Tidak ada konfigurasi email aktif"));
    }

    /** Ambil semua konfigurasi email */
    public List<EmailConfigResponseDTO> getAllConfigs() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /** Simpan konfigurasi baru, nonaktifkan yang lama + enkripsi password */
    @Transactional
    public EmailConfigResponseDTO saveConfig(EmailConfigRequestDTO dto) {
        validate(dto);

        repository.findAll().forEach(cfg -> cfg.setActive(false));
        repository.saveAll(repository.findAll());

        EmailConfig config = EmailConfig.builder()
                .host(dto.getHost())
                .port(dto.getPort())
                .username(dto.getUsername())
                .password(AESUtil.encrypt(dto.getPassword()))
                .useTls(Boolean.TRUE.equals(dto.getUseTls()))
                .active(true)
                .build();

        repository.save(config);
        return mapToResponse(config);
    }

    /** Bangun JavaMailSender dari konfigurasi aktif */
    public JavaMailSenderImpl createMailSenderFromActive() {
        return buildSender(getActiveConfigEntity());
    }

    // =========================
    // Helpers
    // =========================
    private EmailConfigResponseDTO mapToResponse(EmailConfig config) {
        return EmailConfigResponseDTO.builder()
                .id(config.getId())
                .host(config.getHost())
                .port(config.getPort())
                .username(config.getUsername())
                .useTls(config.getUseTls())
                .active(config.getActive())
                .createdAt(config.getCreatedAt())
                .updatedAt(config.getUpdatedAt())
                .build();
    }

    private void validate(EmailConfigRequestDTO dto) {
        if (dto.getHost() == null || dto.getHost().isBlank()) {
            throw new IllegalArgumentException("Host SMTP tidak boleh kosong");
        }
        if (dto.getPort() == null || dto.getPort() <= 0) {
            throw new IllegalArgumentException("Port SMTP tidak valid");
        }
        if (dto.getUsername() == null || dto.getUsername().isBlank()) {
            throw new IllegalArgumentException("Username SMTP tidak boleh kosong");
        }
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password SMTP tidak boleh kosong");
        }
    }

    private JavaMailSenderImpl buildSender(EmailConfig config) {
        String realPassword = AESUtil.decrypt(config.getPassword());

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(config.getHost());
        sender.setPort(config.getPort());
        sender.setUsername(config.getUsername());
        sender.setPassword(realPassword);

        Properties props = sender.getJavaMailProperties();
        boolean hasAuth = config.getUsername() != null && !config.getUsername().isBlank();

        props.put("mail.smtp.auth", String.valueOf(hasAuth));
        props.put("mail.smtp.starttls.enable", String.valueOf(Boolean.TRUE.equals(config.getUseTls())));
        props.put("mail.smtp.timeout", "30000");
        props.put("mail.smtp.connectiontimeout", "30000");
        props.put("mail.smtp.writetimeout", "30000");
        props.put("mail.smtp.ssl.trust", config.getHost());

        return sender;
    }

    public void testConnection(String to) {
        testConnection(to, null, null);
    }

    public void testConnection(String to, String subjectOverride, String bodyOverride) {
        if (to == null || to.isBlank())
            throw new IllegalArgumentException("Email tujuan tidak boleh kosong");

        try {
            JavaMailSenderImpl sender = createMailSenderFromActive();

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddr = Objects.toString(sender.getUsername(), "no-reply@megacert.local");
            helper.setFrom(fromAddr);
            helper.setTo(to);

            String defaultSubject = "Test SMTP Mega Certification";
            String subject = (subjectOverride == null || subjectOverride.isBlank()) ? defaultSubject : subjectOverride;
            helper.setSubject(subject);

            String defaultBody = "Halo,\n\n" +
                    "Ini adalah email percobaan dari sistem sertifikasi Bank Mega.\n" +
                    "Kalau Anda menerima email ini, berarti konfigurasi SMTP sudah berfungsi dengan baik.\n\n" +
                    "Salam,\n" +
                    "Divisi Learning & Development\n" +
                    "Bank Mega";

            String bodyPlain = (bodyOverride == null || bodyOverride.isBlank()) ? defaultBody : bodyOverride;

            String escaped = htmlEscape(bodyPlain).replace("\n", "<br/>");
            String html = "<div style='font-family:Arial,sans-serif;line-height:1.6;font-size:14px'>" +
                    escaped +
                    "<br><p style='font-size:12px;color:gray;margin-top:8px;'>--<br>" +
                    "Dikirim otomatis oleh <b>Mega Certification System</b></p></div>";

            helper.setText(html, true);
            sender.send(message);

            log.info("Test email OK ke {}", to);

        } catch (Exception e) {
            log.error("Gagal test email {}: {}", to, e.getMessage());
            throw new RuntimeException("Gagal mengirim test email: " + e.getMessage());
        }
    }

    private String htmlEscape(String s) {
        if (s == null)
            return "";
        String out = s;
        out = out.replace("&", "&amp;");
        out = out.replace("<", "&lt;");
        out = out.replace(">", "&gt;");
        out = out.replace("\"", "&quot;");
        out = out.replace("'", "&#039;");
        return out;
    }
}
