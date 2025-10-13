package com.bankmega.certification.service;

import com.bankmega.certification.entity.EmailConfig;
import com.bankmega.certification.entity.Notification;
import com.bankmega.certification.repository.NotificationRepository;
import com.bankmega.certification.security.AESUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Properties;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailConfigService emailConfigService;

    /**
     * Kirim notifikasi (in-app + email)
     */
    public Notification sendNotification(Long recipientId, String recipientEmail, String title, String message) {
        // 📨 1️⃣ Simpan notifikasi in-app
        Notification notification = Notification.builder()
                .recipientId(recipientId)
                .title(title)
                .message(message)
                .readStatus(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);

        // 💌 2️⃣ Kirim email jika tersedia
        if (recipientEmail != null && !recipientEmail.isBlank()) {
            sendEmail(recipientEmail, title, message);
        }

        return notification;
    }

    /**
     * Kirim email berdasarkan konfigurasi aktif dari EmailConfig
     */
    private void sendEmail(String to, String subject, String text) {
        try {
            // 🔹 Ambil konfigurasi aktif
            EmailConfig config = emailConfigService.getActiveConfigEntity();

            if (config.getPassword() == null || config.getPassword().isBlank()) {
                throw new RuntimeException("Password SMTP kosong di konfigurasi aktif");
            }

            // 🔐 Dekripsi password
            String realPassword = AESUtil.decrypt(config.getPassword());

            // 🔧 Setup JavaMailSender dinamis
            JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
            mailSender.setHost(config.getHost());
            mailSender.setPort(config.getPort());
            mailSender.setUsername(config.getUsername());
            mailSender.setPassword(realPassword);

            Properties props = mailSender.getJavaMailProperties();
            props.put("mail.smtp.auth", "true");
            props.put("mail.smtp.starttls.enable", String.valueOf(config.getUseTls()));
            props.put("mail.smtp.timeout", "30000");
            props.put("mail.smtp.connectiontimeout", "30000");
            props.put("mail.smtp.writetimeout", "30000");

            // 📨 Siapkan pesan email
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(config.getUsername());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text + "\n\n--\nDikirim otomatis oleh Mega Certification System");

            // 🚀 Kirim email
            mailSender.send(message);
            System.out.println("✅ Email terkirim ke " + to);

        } catch (Exception e) {
            System.err.println("❌ Gagal kirim email ke " + to + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Ambil semua notifikasi user
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Tandai notifikasi sebagai sudah dibaca
     */
    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notif -> {
            notif.setReadStatus(true);
            notif.setReadAt(LocalDateTime.now());
            notificationRepository.save(notif);
        });
    }

    /**
     * Hitung jumlah notifikasi yang belum dibaca
     */
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndReadStatusFalse(userId);
    }

    /**
     * Endpoint test kirim email (buat testing dari Postman/FE)
     */
    public void testEmail(String to) {
        sendEmail(
                to,
                "📧 Test Email dari Mega Certification System",
                """
                        Halo Bro 👋

                        Ini adalah email test dari sistem sertifikasi Bank Mega.
                        Kalau lo nerima email ini, berarti konfigurasi SMTP aktif udah beres 💪

                        Salam,
                        Mega Certification Team
                        """);
    }
}
