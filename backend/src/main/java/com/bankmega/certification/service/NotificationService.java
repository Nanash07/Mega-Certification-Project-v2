package com.bankmega.certification.service;

import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.EmployeeBatchRepository;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import com.bankmega.certification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeCertificationRepository employeeCertificationRepository;
    private final EmployeeBatchRepository employeeBatchRepository;
    private final EmailConfigService emailConfigService;
    private final NotificationTemplateService templateService;
    private final JavaMailSenderImpl reusableMailSender; // ✅ pake bean dari MailSenderConfig

    // ================== GENERIC NOTIFICATION ==================
    public Notification sendNotification(Long userId, String email, String title, String message,
            Notification.Type type, String relatedEntity, Long relatedEntityId) {

        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .relatedEntity(relatedEntity)
                .relatedEntityId(relatedEntityId)
                .createdAt(LocalDateTime.now())
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        log.info("📨 Notifikasi disimpan ke DB untuk userId={} | {}", userId, title);

        if (email != null && !email.isBlank()) {
            sendEmailAsync(email, title, message);
        }

        return notification;
    }

    // ================== REMINDER SERTIFIKASI ==================
    public void sendCertificationReminder(Employee employee, EmployeeCertification cert) {
        try {
            if (employee == null || employee.getEmail() == null || employee.getEmail().isBlank())
                return;
            if (cert == null || cert.getCertificationRule() == null)
                return;

            NotificationTemplate.Code code = NotificationTemplate.Code.CERT_REMINDER;
            var rule = cert.getCertificationRule();
            var certEntity = rule.getCertification();

            // 🔹 Lengkapi nama sertifikasi
            String fullName = certEntity != null ? certEntity.getName() : "-";
            if (rule.getCertificationLevel() != null)
                fullName += " - " + rule.getCertificationLevel().getName();
            if (rule.getSubField() != null)
                fullName += " (" + rule.getSubField().getName() + ")";

            String subject = templateService.generateTitle(code, employee, fullName, cert.getValidUntil(), null, null);
            String body = templateService.generateMessage(code, employee, fullName, cert.getValidUntil(), null, null);

            sendNotification(employee.getId(), employee.getEmail(), subject, body,
                    Notification.Type.CERT_REMINDER, "EmployeeCertification", cert.getId());

            log.info("✅ Reminder cert dikirim ke {} untuk sertifikasi {}", employee.getEmail(), fullName);

            // Tambah jeda kecil antar email biar Gmail gak nendang
            TimeUnit.SECONDS.sleep(1);

        } catch (Exception e) {
            log.error("❌ Gagal kirim reminder cert ke {}: {}", employee != null ? employee.getEmail() : "null",
                    e.getMessage(), e);
        }
    }

    // ================== NOTIFIKASI BATCH ==================
    public void sendBatchNotification(Employee employee, String namaSertifikasi, String namaBatch,
            LocalDateTime mulaiTanggal) {
        try {
            if (employee == null || employee.getEmail() == null || employee.getEmail().isBlank())
                return;

            NotificationTemplate.Code code = NotificationTemplate.Code.BATCH_NOTIFICATION;
            String subject = templateService.generateTitle(
                    code, employee, namaSertifikasi, null, namaBatch,
                    mulaiTanggal != null ? mulaiTanggal.toLocalDate() : null);
            String body = templateService.generateMessage(
                    code, employee, namaSertifikasi, null, namaBatch,
                    mulaiTanggal != null ? mulaiTanggal.toLocalDate() : null);

            sendNotification(employee.getId(), employee.getEmail(), subject, body,
                    Notification.Type.BATCH_NOTIFICATION, "Batch", null);

            log.info("✅ Notifikasi batch '{}' dikirim ke {}", namaBatch, employee.getEmail());

        } catch (Exception e) {
            log.error("❌ Gagal kirim notifikasi batch ke {}: {}", employee != null ? employee.getEmail() : "null",
                    e.getMessage(), e);
        }
    }

    // ================== EMAIL SENDER (OPTIMIZED) ==================
    @Async("mailExecutor")
    protected void sendEmailAsync(String to, String subject, String htmlContent) {
        log.info("🚀 Kirim email async ke {} | {}", to, subject);

        int retries = 3;
        while (retries-- > 0) {
            try {
                MimeMessage message = reusableMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                helper.setFrom(reusableMailSender.getUsername());
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText("""
                        <div style='font-family: Arial, sans-serif; line-height: 1.6;'>
                            %s
                            <br><br>
                            <p style='font-size: 12px; color: gray;'>
                                --<br>Dikirim otomatis oleh <b>Mega Certification System</b>
                            </p>
                        </div>
                        """.formatted(htmlContent.replace("\n", "<br>")), true);

                reusableMailSender.send(message);
                log.info("✅ Email sukses dikirim ke {}", to);
                return;

            } catch (Exception e) {
                log.warn("⚠️ Gagal kirim email ke {} (retry {}x): {}", to, (3 - retries), e.getMessage());
                try {
                    TimeUnit.SECONDS.sleep(2);
                } catch (InterruptedException ignored) {
                }
            }
        }

        log.error("❌ Email gagal dikirim ke {} setelah 3 percobaan", to);
    }

    // ================== UTIL ==================
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notif -> {
            if (!notif.isRead()) {
                notif.setRead(true);
                notif.setReadAt(LocalDateTime.now());
                notificationRepository.save(notif);
                log.info("📬 Notifikasi {} ditandai sudah dibaca", notificationId);
            }
        });
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // ================== TEST EMAIL ==================
    public void testEmail(String to) {
        log.info("📧 Kirim test email ke {}", to);
        sendEmailAsync(
                to,
                "Test Email dari Mega Certification System",
                """
                        <p>Halo,</p>
                        <p>Ini adalah email percobaan dari sistem sertifikasi Bank Mega.</p>
                        <p>Kalau Anda menerima email ini, berarti konfigurasi SMTP sudah berfungsi dengan baik.</p>
                        <p>Salam,<br><b>Divisi Learning & Development</b><br>Bank Mega</p>
                        """);
    }

    // ================== PROCESS CERT REMINDER ==================
    public void processCertReminder() {
        LocalDate today = LocalDate.now();
        log.info("🔄 Proses reminder sertifikasi untuk tanggal {}", today);

        List<EmployeeCertification> dueCerts = employeeCertificationRepository
                .findByReminderDateAndDeletedAtIsNull(today);

        if (dueCerts.isEmpty()) {
            log.info("✅ Tidak ada sertifikasi due hari ini");
            return;
        }

        List<Notification> sent = notificationRepository
                .findByTypeAndRelatedEntity(Notification.Type.CERT_REMINDER, "EmployeeCertification");

        Set<String> sentPairs = sent.stream()
                .map(n -> n.getUserId() + "-" + n.getRelatedEntityId())
                .collect(Collectors.toSet());

        List<EmployeeCertification> toSend = dueCerts.stream()
                .filter(c -> c.getEmployee() != null)
                .filter(c -> !sentPairs.contains(c.getEmployee().getId() + "-" + c.getId()))
                .toList();

        log.info("📬 Ditemukan {} sertifikasi due untuk dikirim reminder", toSend.size());

        for (EmployeeCertification cert : toSend) {
            sendCertificationReminder(cert.getEmployee(), cert);
        }

        log.info("✅ Semua reminder sertifikasi ({}) berhasil diproses!", toSend.size());
    }

    // ================== PROCESS BATCH NOTIFICATION ==================
    public void processBatchNotification() {
        log.info("🔄 Proses notifikasi batch berjalan...");
        List<EmployeeBatch> active = employeeBatchRepository.findByBatch_StatusInAndDeletedAtIsNull(
                List.of(Batch.Status.PLANNED, Batch.Status.ONGOING));

        for (EmployeeBatch eb : active) {
            Employee emp = eb.getEmployee();
            if (emp == null || emp.getEmail() == null || emp.getEmail().isBlank())
                continue;

            Batch batch = eb.getBatch();
            if (batch == null || batch.getCertificationRule() == null)
                continue;

            var rule = batch.getCertificationRule();
            String namaSertifikasi = rule.getCertification().getName();
            if (rule.getCertificationLevel() != null)
                namaSertifikasi += " - " + rule.getCertificationLevel().getName();
            if (rule.getSubField() != null)
                namaSertifikasi += " (" + rule.getSubField().getName() + ")";

            sendBatchNotification(emp, namaSertifikasi, batch.getBatchName(),
                    batch.getStartDate() != null ? batch.getStartDate().atStartOfDay() : LocalDateTime.now());
        }
    }
}
