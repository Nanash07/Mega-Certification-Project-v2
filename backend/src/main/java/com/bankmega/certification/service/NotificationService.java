package com.bankmega.certification.service;

import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.Notification;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.repository.BatchRepository;
import com.bankmega.certification.repository.EmployeeBatchRepository;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import com.bankmega.certification.repository.NotificationRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeCertificationRepository employeeCertificationRepository;
    private final EmployeeBatchRepository employeeBatchRepository;
    private final BatchRepository batchRepository;

    // masih dipakai utk reminder sertifikasi
    private final EmailConfigService emailConfigService; // inject existing bean (meski di sini hanya fallback)
    private final NotificationTemplateService templateService; // generate title/body untuk CERT_REMINDER

    private final JavaMailSenderImpl reusableMailSender; // bean dari MailSenderConfig

    // ================== NOTIFICATION RECORD + EMAIL ==================
    public Notification sendNotification(
            Long userId,
            String email,
            String title,
            String message,
            Notification.Type type,
            String relatedEntity,
            Long relatedEntityId) {

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
        log.info("📨 Notifikasi disimpan untuk userId={} | {}", userId, title);

        if (email != null && !email.isBlank()) {
            sendEmailAsync(email, title, message);
        }

        return notification;
    }

    // ================== EMAIL SENDER (ASYNC + RETRY) ==================
    @Async("mailExecutor")
    protected void sendEmailAsync(String to, String subject, String htmlContent) {
        log.info("🚀 Kirim email async ke {} | {}", to, subject);

        int retries = 3;
        while (retries-- > 0) {
            try {
                MimeMessage message = reusableMailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                // fallback from address kalau username null
                String fromAddr = Objects.toString(reusableMailSender.getUsername(), "no-reply@megacert.local");
                helper.setFrom(fromAddr);
                helper.setTo(to);
                helper.setSubject(subject);
                helper.setText("""
                        <div style='font-family: Arial, sans-serif; line-height: 1.6; font-size:14px;'>
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

    // ================== REMINDER SERTIFIKASI ==================
    public void sendCertificationReminder(Employee employee, EmployeeCertification cert) {
        try {
            if (employee == null || employee.getEmail() == null || employee.getEmail().isBlank())
                return;
            if (cert == null || cert.getCertificationRule() == null)
                return;

            var rule = cert.getCertificationRule();
            var certEntity = rule.getCertification();

            String fullName = (certEntity != null ? certEntity.getName() : "-");
            if (rule.getCertificationLevel() != null)
                fullName += " - " + rule.getCertificationLevel().getName();
            if (rule.getSubField() != null)
                fullName += " (" + rule.getSubField().getName() + ")";

            String subject = templateService.generateTitle(
                    NotificationTemplate.Code.CERT_REMINDER, employee, fullName, cert.getValidUntil(), null, null);
            String body = templateService.generateMessage(
                    NotificationTemplate.Code.CERT_REMINDER, employee, fullName, cert.getValidUntil(), null, null);

            sendNotification(employee.getId(), employee.getEmail(), subject, body,
                    Notification.Type.CERT_REMINDER, "EmployeeCertification", cert.getId());

            log.info("✅ Reminder cert dikirim ke {} untuk {}", employee.getEmail(), fullName);
            TimeUnit.MILLISECONDS.sleep(300);

        } catch (Exception e) {
            log.error("❌ Gagal kirim reminder cert ke {}: {}", employee != null ? employee.getEmail() : "null",
                    e.getMessage(), e);
        }
    }

    public void processCertReminder() {
        LocalDate today = LocalDate.now();
        log.info("🔄 Proses reminder sertifikasi untuk {}", today);

        List<EmployeeCertification> dueCerts = employeeCertificationRepository
                .findByReminderDateAndDeletedAtIsNull(today);

        if (dueCerts.isEmpty()) {
            log.info("✅ Tidak ada sertifikasi due hari ini");
            return;
        }

        List<Notification> sent = notificationRepository.findByTypeAndRelatedEntity(Notification.Type.CERT_REMINDER,
                "EmployeeCertification");

        Set<String> sentPairs = sent.stream()
                .map(n -> n.getUserId() + "-" + n.getRelatedEntityId())
                .collect(Collectors.toSet());

        List<EmployeeCertification> toSend = dueCerts.stream()
                .filter(c -> c.getEmployee() != null)
                .filter(c -> !sentPairs.contains(c.getEmployee().getId() + "-" + c.getId()))
                .toList();

        log.info("📬 {} sertifikasi due akan dikirim reminder", toSend.size());

        for (EmployeeCertification cert : toSend) {
            sendCertificationReminder(cert.getEmployee(), cert);
        }

        log.info("✅ Selesai proses reminder sertifikasi ({} kirim)", toSend.size());
    }

    // ================== BATCH NOTIFICATION (HANYA UNTUK 1 BATCH)
    // ==================
    /**
     * Kirim notifikasi ke semua peserta dalam 1 batch tertentu (sesuai tombol yang
     * diklik).
     * Bisa difilter by status peserta (opsional).
     */
    public int notifyParticipantsByBatch(Long batchId, EmployeeBatch.Status onlyStatus) {
        Batch batch = batchRepository.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found with id " + batchId));

        // Ambil peserta batch INI saja
        List<EmployeeBatch> participants = employeeBatchRepository.findByBatch_IdAndDeletedAtIsNull(batchId);
        if (onlyStatus != null) {
            participants = participants.stream()
                    .filter(p -> onlyStatus.equals(p.getStatus()))
                    .toList();
        }

        if (participants.isEmpty()) {
            log.info("ℹ️ Tidak ada peserta aktif untuk batch {}", batch.getBatchName());
            return 0;
        }

        // Hindari duplikasi kirim per employee
        Set<Long> sentEmployees = new LinkedHashSet<>();
        int sent = 0;

        for (EmployeeBatch eb : participants) {
            if (eb.getBatch() == null || !Objects.equals(eb.getBatch().getId(), batchId))
                continue; // safety
            Employee emp = eb.getEmployee();
            if (emp == null || emp.getEmail() == null || emp.getEmail().isBlank())
                continue;
            if (!sentEmployees.add(emp.getId()))
                continue; // sudah dikirim

            sendBatchNotification(emp, batch);
            sent++;
        }

        log.info("📬 Notifikasi batch '{}' (ID={}) terkirim ke {} peserta", batch.getBatchName(), batchId, sent);
        return sent;
    }

    /**
     * Kirim notifikasi batch dengan DETAIL lengkap (format HTML) untuk 1 peserta.
     */
    public void sendBatchNotification(Employee employee, Batch batch) {
        try {
            if (employee == null || employee.getEmail() == null || employee.getEmail().isBlank())
                return;
            if (batch == null || batch.getCertificationRule() == null)
                return;

            String certFullName = buildCertificationFullName(batch.getCertificationRule());
            String subject = buildBatchEmailSubject(batch, certFullName);
            String body = buildBatchEmailBody(batch, certFullName, employee);

            sendNotification(
                    employee.getId(),
                    employee.getEmail(),
                    subject,
                    body,
                    Notification.Type.BATCH_NOTIFICATION,
                    "Batch",
                    batch.getId());

            log.info("✅ Notifikasi batch '{}' dikirim ke {}", batch.getBatchName(), employee.getEmail());
            TimeUnit.MILLISECONDS.sleep(300);

        } catch (Exception e) {
            log.error("❌ Gagal kirim notifikasi batch ke {}: {}", employee != null ? employee.getEmail() : "null",
                    e.getMessage(), e);
        }
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

    // ================== PRIVATE HELPERS ==================
    private static final DateTimeFormatter ID_DATE = DateTimeFormatter.ofPattern("d MMMM yyyy",
            Locale.forLanguageTag("id-ID"));

    private String buildCertificationFullName(CertificationRule rule) {
        if (rule == null)
            return "-";
        String name = (rule.getCertification() != null ? rule.getCertification().getName() : "-");
        if (rule.getCertificationLevel() != null)
            name += " - " + rule.getCertificationLevel().getName();
        if (rule.getSubField() != null)
            name += " (" + rule.getSubField().getName() + ")";
        return name;
    }

    private String buildBatchEmailSubject(Batch batch, String certFullName) {
        String type = batch.getType() != null ? batch.getType().name() : "BATCH";
        String start = batch.getStartDate() != null ? batch.getStartDate().format(ID_DATE) : "-";
        return "[%s] %s - %s (Mulai %s)".formatted(type, safe(batch.getBatchName()), safe(certFullName), start);
    }

    private String buildBatchEmailBody(Batch batch, String certFullName, Employee emp) {
        String kode = (batch.getCertificationRule() != null && batch.getCertificationRule().getCertification() != null)
                ? safe(batch.getCertificationRule().getCertification().getCode())
                : "-";
        String level = (batch.getCertificationRule() != null
                && batch.getCertificationRule().getCertificationLevel() != null)
                        ? safe(batch.getCertificationRule().getCertificationLevel().getName())
                        : "-";
        String sub = (batch.getCertificationRule() != null && batch.getCertificationRule().getSubField() != null)
                ? safe(batch.getCertificationRule().getSubField().getName())
                : "-";

        String lembaga = (batch.getInstitution() != null) ? safe(batch.getInstitution().getName()) : "-";
        String mulai = batch.getStartDate() != null ? batch.getStartDate().format(ID_DATE) : "-";
        String selesai = batch.getEndDate() != null ? batch.getEndDate().format(ID_DATE) : "-";
        String kuota = batch.getQuota() != null ? String.valueOf(batch.getQuota()) : "-";
        String status = batch.getStatus() != null ? batch.getStatus().name() : "-";
        String jenis = batch.getType() != null ? batch.getType().name() : "-";

        return """
                <p>%s %s,</p>
                <p>Anda terdaftar pada <b>%s</b>: <b>%s</b>.</p>
                <table style="border-collapse:collapse; font-size:14px;">
                  <tr><td style="padding:2px 8px;">Sertifikasi</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Kode</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Level</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Sub Bidang</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Lembaga</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Jadwal</td><td>: %s s/d %s</td></tr>
                  <tr><td style="padding:2px 8px;">Kuota</td><td>: %s</td></tr>
                  <tr><td style="padding:2px 8px;">Status Batch</td><td>: %s</td></tr>
                </table>
                <p>Mohon hadir sesuai jadwal. Terima kasih.</p>
                """.formatted(getSapaan(emp), safe(emp != null ? emp.getName() : null),
                jenis, safe(batch.getBatchName()),
                safe(certFullName), kode, level, sub, lembaga, mulai, selesai, kuota, status);
    }

    private String getSapaan(Employee employee) {
        if (employee == null || employee.getGender() == null || employee.getGender().isBlank())
            return "Bapak/Ibu";
        return switch (employee.getGender().trim().toUpperCase()) {
            case "M" -> "Bapak";
            case "F" -> "Ibu";
            default -> "Bapak/Ibu";
        };
    }

    private String safe(String val) {
        return (val != null && !val.isBlank()) ? val : "-";
    }
}
