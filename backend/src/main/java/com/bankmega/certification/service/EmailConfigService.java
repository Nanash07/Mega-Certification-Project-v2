package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmailConfigRequestDTO;
import com.bankmega.certification.dto.EmailConfigResponseDTO;
import com.bankmega.certification.entity.EmailConfig;
import com.bankmega.certification.repository.EmailConfigRepository;
import com.bankmega.certification.security.AESUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Properties;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmailConfigService {

    private final EmailConfigRepository repository;

    /**
     * Ambil konfigurasi email aktif (DTO)
     */
    public EmailConfigResponseDTO getActiveConfig() {
        EmailConfig config = repository.findByActiveTrue()
                .orElseThrow(() -> new RuntimeException("Tidak ada konfigurasi email aktif"));
        return mapToResponse(config);
    }

    /**
     * Ambil konfigurasi email aktif (Entity)
     */
    public EmailConfig getActiveConfigEntity() {
        return repository.findByActiveTrue()
                .orElseThrow(() -> new RuntimeException("Tidak ada konfigurasi email aktif"));
    }

    /**
     * Ambil semua konfigurasi email
     */
    public List<EmailConfigResponseDTO> getAllConfigs() {
        return repository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Simpan konfigurasi baru, nonaktifkan yang lama, dan enkripsi password pakai
     * AES
     */
    public EmailConfigResponseDTO saveConfig(EmailConfigRequestDTO dto) {
        if (dto.getPassword() == null || dto.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password SMTP tidak boleh kosong");
        }

        // 🔹 Nonaktifkan semua konfigurasi lama
        List<EmailConfig> allConfigs = repository.findAll();
        allConfigs.forEach(cfg -> cfg.setActive(false));
        repository.saveAll(allConfigs);

        // 🔹 Simpan konfigurasi baru dengan password terenkripsi AES
        EmailConfig config = EmailConfig.builder()
                .host(dto.getHost())
                .port(dto.getPort())
                .username(dto.getUsername())
                .password(AESUtil.encrypt(dto.getPassword())) // ✅ AES encryption
                .useTls(dto.getUseTls())
                .active(true)
                .build();

        repository.save(config);
        return mapToResponse(config);
    }

    /**
     * Ubah entity ke response DTO
     */
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

    /**
     * Tes koneksi email SMTP aktif (langsung kirim ke alamat tujuan)
     */
    public void testConnection(String to) {
        try {
            EmailConfig config = getActiveConfigEntity();

            if (config.getPassword() == null || config.getPassword().isBlank()) {
                throw new RuntimeException("Password SMTP kosong di konfigurasi aktif");
            }

            // 🔐 Dekripsi password AES
            String realPassword = AESUtil.decrypt(config.getPassword());

            // 🔧 Setup mail sender dinamis
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(config.getHost());
            sender.setPort(config.getPort());
            sender.setUsername(config.getUsername());
            sender.setPassword(realPassword);

            Properties props = sender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", String.valueOf(config.getUseTls()));
            props.put("mail.smtp.timeout", "30000");
            props.put("mail.smtp.connectiontimeout", "30000");
            props.put("mail.smtp.writetimeout", "30000");

            // 📨 Kirim pesan test
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(config.getUsername());
            message.setTo(to);
            message.setSubject("📧 Test SMTP Mega Certification");
            message.setText("""
                    Halo Bro 👋

                    Koneksi SMTP berhasil diuji dari sistem Mega Certification.
                    Kalau lo baca email ini, berarti konfigurasi SMTP udah aktif dan aman 🔒

                    Salam,
                    Mega Certification System
                    """);

            sender.send(message);
            System.out.println("✅ Test email berhasil dikirim ke: " + to);

        } catch (Exception e) {
            System.err.println("Gagal mengirim test email: " + e.getMessage());
            throw new RuntimeException("Gagal mengirim test email: " + e.getMessage(), e);
        }
    }
}
