package com.bankmega.certification.service;

import com.bankmega.certification.entity.Batch;
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
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmployeeCertificationRepository employeeCertificationRepository;
    private final EmployeeBatchRepository employeeBatchRepository;
    private final BatchRepository batchRepository;
    private final EmailConfigService emailConfigService; // masih disuntik, ga dipakai di sini (opsional dipakai nanti)
    private final NotificationTemplateService templateService;
    private final JavaMailSenderImpl reusableMailSender;

    // =========================================================================
    // SAVE NOTIFICATION + EMAIL
    // =========================================================================

    /** Overload baru: simpan plain ke DB, email kirim versi HTML. */
    public Notification sendNotification(
            Long userId,
            String email,
            String title,
            String messagePlain,
            String messageEmailHtml,
            Notification.Type type,
            String relatedEntity,
            Long relatedEntityId) {

        final Notification notif = Notification.builder()
                .userId(userId)
                .title(title)
                .message(messagePlain) // in-app: plain
                .type(type)
                .isRead(false)
                .relatedEntity(relatedEntity)
                .relatedEntityId(relatedEntityId)
                .createdAt(LocalDateTime.now())
                .sentAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notif);

        if (!isBlank(email)) {
            sendEmailAsync(email, title, messageEmailHtml); // email: HTML (bold)
        }
        return notif;
    }

    /**
     * Back-compat: kalau dipanggil versi lama, email & in-app sama-sama pakai
     * plain.
     */
    public Notification sendNotification(
            Long userId,
            String email,
            String title,
            String message,
            Notification.Type type,
            String relatedEntity,
            Long relatedEntityId) {
        return sendNotification(userId, email, title, message, message, type, relatedEntity, relatedEntityId);
    }

    @Async("mailExecutor")
    protected void sendEmailAsync(String to, String subject, String htmlContent) {
        // 1 kali retry ringan sudah cukup biar gak nge-blok lama
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                final MimeMessage message = reusableMailSender.createMimeMessage();
                final MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

                final String fromAddr = Objects.toString(reusableMailSender.getUsername(), "no-reply@megacert.local");
                helper.setFrom(fromAddr);
                helper.setTo(to);
                helper.setSubject(subject);

                // wrapper HTML: newline di body sudah dikonversi ke <br/> di builder kita
                final String html = "<div style='font-family:Arial,sans-serif;line-height:1.6;font-size:14px'>"
                        + htmlContent
                        + "<br><p style='font-size:12px;color:gray;margin-top:8px;'>--<br>"
                        + "Dikirim otomatis oleh <b>Mega Certification System</b></p></div>";

                helper.setText(html, true);
                reusableMailSender.send(message);
                return; // sukses, stop retry
            } catch (Exception e) {
                if (attempt == 2) {
                    log.error("Email gagal ke {} setelah {} kali coba: {}", to, attempt, e.getMessage());
                } else {
                    log.warn("Gagal kirim email ke {} (attempt {}): {}", to, attempt, e.getMessage());
                }
            }
        }
    }

    // =========================================================================
    // CERT REMINDER
    // =========================================================================
    public void sendCertificationReminder(Employee employee, EmployeeCertification cert) {
        if (employee == null || isBlank(employee.getEmail()))
            return;
        if (cert == null || cert.getCertificationRule() == null)
            return;

        final String certName = buildCertificationFullName(cert);
        final String subject = templateService.generateTitle(
                NotificationTemplate.Code.CERT_REMINDER, employee, certName, cert.getValidUntil(), null, null);
        final String bodyPlain = templateService.generateMessage(
                NotificationTemplate.Code.CERT_REMINDER, employee, certName, cert.getValidUntil(), null, null);

        // Build HTML dengan nilai variabel dibold
        Map<String, String> vars = buildCommonVars(employee);
        vars.put("{{namaSertifikasi}}", certName);
        vars.put("{{berlakuSampai}}", formatDateId(cert.getValidUntil()));

        final String bodyHtml = buildHtmlWithBold(bodyPlain, vars);

        sendNotification(
                employee.getId(),
                employee.getEmail(),
                subject,
                bodyPlain,
                bodyHtml,
                Notification.Type.CERT_REMINDER,
                "EmployeeCertification",
                cert.getId());
    }

    public void processCertReminder() {
        final LocalDate today = LocalDate.now();
        final List<EmployeeCertification> due = employeeCertificationRepository
                .findByReminderDateAndDeletedAtIsNull(today);

        if (due == null || due.isEmpty())
            return;

        final List<Notification> already = notificationRepository
                .findByTypeAndRelatedEntity(Notification.Type.CERT_REMINDER, "EmployeeCertification");

        final Set<String> sentPairs = already.stream()
                .map(n -> n.getUserId() + "-" + n.getRelatedEntityId())
                .collect(Collectors.toSet());

        final List<EmployeeCertification> toSend = due.stream()
                .filter(c -> c.getEmployee() != null)
                .filter(c -> !sentPairs.contains(c.getEmployee().getId() + "-" + c.getId()))
                .collect(Collectors.toList());

        for (EmployeeCertification c : toSend) {
            sendCertificationReminder(c.getEmployee(), c);
        }
    }

    // =========================================================================
    // CERT EXPIRED
    // =========================================================================
    public void sendCertificationExpired(Employee employee, EmployeeCertification cert) {
        if (employee == null || isBlank(employee.getEmail()))
            return;
        if (cert == null || cert.getCertificationRule() == null)
            return;

        final String certName = buildCertificationFullName(cert);
        final String subject = templateService.generateTitle(
                NotificationTemplate.Code.EXPIRED_NOTICE, employee, certName, cert.getValidUntil(), null, null);
        final String bodyPlain = templateService.generateMessage(
                NotificationTemplate.Code.EXPIRED_NOTICE, employee, certName, cert.getValidUntil(), null, null);

        Map<String, String> vars = buildCommonVars(employee);
        vars.put("{{namaSertifikasi}}", certName);
        vars.put("{{berlakuSampai}}", formatDateId(cert.getValidUntil()));

        final String bodyHtml = buildHtmlWithBold(bodyPlain, vars);

        sendNotification(
                employee.getId(),
                employee.getEmail(),
                subject,
                bodyPlain,
                bodyHtml,
                Notification.Type.EXPIRED_NOTICE,
                "EmployeeCertification",
                cert.getId());
    }

    public void processCertExpired() {
        final LocalDate today = LocalDate.now();

        // <= today (bukan H+1)
        final List<EmployeeCertification> expired = employeeCertificationRepository
                .findByValidUntilLessThanEqualAndDeletedAtIsNull(today);

        if (expired == null || expired.isEmpty())
            return;

        final List<Notification> already = notificationRepository
                .findByTypeAndRelatedEntity(Notification.Type.EXPIRED_NOTICE, "EmployeeCertification");

        final Set<String> sentPairs = already.stream()
                .map(n -> n.getUserId() + "-" + n.getRelatedEntityId())
                .collect(Collectors.toSet());

        final List<EmployeeCertification> toSend = expired.stream()
                .filter(c -> c.getEmployee() != null)
                .filter(c -> !sentPairs.contains(c.getEmployee().getId() + "-" + c.getId()))
                .toList();

        for (EmployeeCertification c : toSend) {
            sendCertificationExpired(c.getEmployee(), c);
        }
    }

    // =========================================================================
    // BATCH NOTIFICATION
    // =========================================================================
    /** Kirim notifikasi ke semua peserta dalam 1 batch (boleh filter by status). */
    public int notifyParticipantsByBatch(Long batchId, EmployeeBatch.Status onlyStatus) {
        final Batch batch = batchRepository.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found with id " + batchId));

        List<EmployeeBatch> participants = employeeBatchRepository.findByBatch_IdAndDeletedAtIsNull(batchId);
        if (onlyStatus != null) {
            participants = participants.stream()
                    .filter(p -> onlyStatus.equals(p.getStatus()))
                    .collect(Collectors.toList());
        }
        if (participants.isEmpty())
            return 0;

        // hindari double-send bila ada duplikasi employee
        final Set<Long> uniqueEmployeeIds = new LinkedHashSet<Long>();
        int sent = 0;

        for (EmployeeBatch eb : participants) {
            final Employee emp = eb.getEmployee();
            if (emp == null || isBlank(emp.getEmail()))
                continue;
            if (!uniqueEmployeeIds.add(emp.getId()))
                continue;

            sendBatchNotification(emp, batch);
            sent++;
        }
        return sent;
    }

    /**
     * Kirim notifikasi batch untuk 1 peserta, menggunakan template
     * BATCH_NOTIFICATION + extras.
     */
    public void sendBatchNotification(Employee employee, Batch batch) {
        if (employee == null || isBlank(employee.getEmail()))
            return;
        if (batch == null)
            return;

        final Map<String, Object> extras = new LinkedHashMap<String, Object>();
        extras.put("{{namaBatch}}", batch.getBatchName());
        extras.put("{{mulaiTanggal}}", batch.getStartDate());
        extras.put("{{jenisBatch}}", mapJenisBatch(batch.getType())); // training / sertifikasi / refreshment

        final String subject = templateService.generateTitle(
                NotificationTemplate.Code.BATCH_NOTIFICATION, employee, extras);
        final String bodyPlain = templateService.generateMessage(
                NotificationTemplate.Code.BATCH_NOTIFICATION, employee, extras);

        // Build HTML bold
        Map<String, String> vars = buildCommonVars(employee);
        vars.put("{{namaBatch}}", Objects.toString(extras.get("{{namaBatch}}"), "-"));
        vars.put("{{mulaiTanggal}}", formatDateId((LocalDate) extras.get("{{mulaiTanggal}}")));
        vars.put("{{jenisBatch}}", Objects.toString(extras.get("{{jenisBatch}}"), "-"));

        final String bodyHtml = buildHtmlWithBold(bodyPlain, vars);

        sendNotification(
                employee.getId(),
                employee.getEmail(),
                subject,
                bodyPlain,
                bodyHtml,
                Notification.Type.BATCH_NOTIFICATION,
                "Batch",
                batch.getId());
    }

    // =========================================================================
    // PUBLIC API UNTUK CONTROLLER / UI
    // =========================================================================
    public List<Notification> getUserNotifications(Long userId) {
        final List<Notification> list = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list != null ? list : Collections.<Notification>emptyList();
    }

    public void markAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (!n.isRead()) {
                n.setRead(true);
                n.setReadAt(LocalDateTime.now());
                notificationRepository.save(n);
            }
        });
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    public void testEmail(String to) {
        if (isBlank(to))
            return;
        final String bodyPlain = "Halo,\n\nIni adalah email percobaan dari sistem sertifikasi Bank Mega.\n"
                + "Kalau Anda menerima email ini, berarti konfigurasi SMTP sudah berfungsi dengan baik.\n\n"
                + "Salam,\nDivisi Learning & Development\nBank Mega";

        // biar konsisten, bold-kan nilai statis 'Bank Mega' saja sebagai contoh
        Map<String, String> vars = new LinkedHashMap<>();
        vars.put("{{dummy}}", ""); // no-op
        final String bodyHtml = buildHtmlWithBold(bodyPlain, Map.of());

        sendEmailAsync(to, "Test Email dari Mega Certification System", bodyHtml);
    }

    // =========================================================================
    // HELPERS
    // =========================================================================
    private String mapJenisBatch(Batch.BatchType type) {
        if (type == null)
            return "-";
        switch (type) {
            case CERTIFICATION:
                return "Sertifikasi";
            case TRAINING:
                return "Training";
            case REFRESHMENT:
                return "Refreshment";
            default:
                return "-";
        }
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String buildCertificationFullName(EmployeeCertification cert) {
        final var rule = cert.getCertificationRule();
        if (rule == null)
            return "-";
        String name = rule.getCertification() != null ? rule.getCertification().getName() : "-";
        if (rule.getCertificationLevel() != null)
            name += " - " + rule.getCertificationLevel().getName();
        if (rule.getSubField() != null)
            name += " (" + rule.getSubField().getName() + ")";
        return name;
    }

    private Map<String, String> buildCommonVars(Employee emp) {
        Map<String, String> m = new LinkedHashMap<>();
        // key harus sama dengan yang dipakai di template ({{nama}}, {{sapaan}}, dst)
        m.put("{{sapaan}}", computeSalutation(emp));
        m.put("{{nama}}", emp != null ? nullSafe(emp.getName()) : "-");
        return m;
    }

    private String computeSalutation(Employee emp) {
        // Kalau ada field gender di entity, lo bisa refine:
        // return "M".equalsIgnoreCase(emp.getGender()) ? "Bapak" : "Ibu";
        return "Bapak/Ibu";
    }

    private String nullSafe(Object o) {
        return o == null ? "-" : o.toString();
    }

    private String formatDateId(LocalDate date) {
        if (date == null)
            return "-";
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("d MMMM yyyy", Locale.forLanguageTag("id-ID"));
        return date.format(fmt);
    }

    /**
     * Escape HTML sederhana, lalu bold-kan setiap nilai variabel, lalu \n -> <br/>
     * .
     */
    private String buildHtmlWithBold(String plain, Map<String, String> variables) {
        String html = htmlEscape(Objects.toString(plain, ""));
        // bold-kan tiap nilai variabel (setelah di-escape supaya aman)
        for (Map.Entry<String, String> e : variables.entrySet()) {
            String val = e.getValue();
            if (isBlank(val))
                continue;
            String escapedVal = htmlEscape(val);
            html = html.replace(escapedVal, "<b>" + escapedVal + "</b>");
        }
        // newline ke <br/>
        html = html.replace("\r\n", "\n").replace("\n", "<br/>");
        return html;
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
