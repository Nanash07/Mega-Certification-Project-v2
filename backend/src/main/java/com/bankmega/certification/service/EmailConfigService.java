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

    /**
     * Simpan konfigurasi baru, nonaktifkan yang lama (atomic) + enkripsi password
     */
    @Transactional
    public EmailConfigResponseDTO saveConfig(EmailConfigRequestDTO dto) {
        validate(dto);

        // Nonaktifkan semua konfigurasi lama
        repository.findAll().forEach(cfg -> cfg.setActive(false));
        // flush via saveAll
        repository.saveAll(repository.findAll());

        // Simpan konfigurasi baru (password terenkripsi AES)
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

    /**
     * Bangun JavaMailSender berdasarkan konfigurasi aktif (decrypt password, set
     * props)
     */
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
        // trust host (opsional, berguna jika cert self-signed)
        props.put("mail.smtp.ssl.trust", config.getHost());

        return sender;
    }

    /** Tes koneksi + kirim email HTML sederhana memakai konfigurasi aktif */
    public void testConnection(String to) {
        try {
            JavaMailSenderImpl sender = createMailSenderFromActive();

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddr = Objects.toString(sender.getUsername(), "no-reply@megacert.local");
            helper.setFrom(fromAddr);
            helper.setTo(to);
            helper.setSubject("Test SMTP Mega Certification");

            String html = """
                    <div style='font-family:Arial,sans-serif;line-height:1.6;font-size:14px'>
                      <p>Halo Bro 👋</p>
                      <p>Koneksi SMTP berhasil diuji dari sistem <b>Mega Certification</b>.</p>
                      <p>Kalau lo baca email ini, berarti konfigurasi SMTP aktif dan OK 🔒</p>
                      <br>
                      <p style='font-size:12px;color:gray'>--<br>Dikirim otomatis oleh <b>Mega Certification System</b></p>
                    </div>
                    """;
            helper.setText(html, true);

            sender.send(message);
            log.info("✅ Test email berhasil dikirim ke: {}", to);

        } catch (Exception e) {
            log.error("❌ Gagal mengirim test email ke {}: {}", to, e.getMessage(), e);
            throw new RuntimeException("Gagal mengirim test email: " + e.getMessage(), e);
        }
    }
}
