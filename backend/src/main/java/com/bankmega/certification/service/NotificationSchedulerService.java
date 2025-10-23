package com.bankmega.certification.service;

import com.bankmega.certification.entity.NotificationSchedule;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.repository.NotificationScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(value = "app.notifications.scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class NotificationSchedulerService {

    private final NotificationScheduleRepository repo;
    private final NotificationScheduleService scheduleService;
    private final NotificationService notificationService;

    private static final ZoneId ZONE = ZoneId.of("Asia/Jakarta");

    /** In-memory lock per tipe (non-distributed). */
    private final Map<NotificationTemplate.Code, AtomicBoolean> runningFlags = new ConcurrentHashMap<>();

    private AtomicBoolean flag(NotificationTemplate.Code type) {
        return runningFlags.computeIfAbsent(type, k -> new AtomicBoolean(false));
    }

    // 🕐 default tiap 5 menit (override via app.notifications.scheduler-cron)
    @Scheduled(cron = "${app.notifications.scheduler-cron:0 */5 * * * *}", zone = "Asia/Jakarta")
    public void runAllSchedules() {
        final LocalDateTime now = LocalDateTime.now(ZONE);
        log.info("🕐 [Scheduler] Checking notification schedules at {}", now);

        List<NotificationSchedule> schedules = repo.findAll();
        if (schedules.isEmpty()) {
            log.info("ℹ️ Tidak ada jadwal notifikasi di database.");
            return;
        }

        for (NotificationSchedule s : schedules) {
            try {
                NotificationTemplate.Code type = s.getType();
                log.debug("🔍 Evaluating schedule {} (active={}, time={}, lastRun={})",
                        type, s.getActive(), s.getTime(), s.getLastRun());

                if (type == null) {
                    log.warn("⚠️ Schedule tanpa type, id={} dilewati.", s.getId());
                    continue;
                }
                if (!scheduleService.isActiveToday(s)) {
                    log.debug("⏸ Jadwal {} tidak aktif hari ini / skip weekend", type);
                    continue;
                }
                if (!scheduleService.isTimeToRun(s)) {
                    log.debug("🕓 Belum waktunya untuk jadwal {}", type);
                    continue;
                }
                if (alreadyExecutedRecently(s, now)) {
                    log.debug("⏭ Jadwal {} sudah dieksekusi baru-baru ini (lastRun={})", type, s.getLastRun());
                    continue;
                }

                if (!flag(type).compareAndSet(false, true)) {
                    log.warn("⛔ {} masih berjalan, skip eksekusi paralel.", type);
                    continue;
                }

                try {
                    log.info("🚀 Menjalankan jadwal notifikasi untuk {}", type);
                    runScheduleInternal(s);
                    scheduleService.markExecuted(s);
                    log.info("✅ Jadwal {} berhasil dijalankan & ditandai executed", type);
                } finally {
                    flag(type).set(false);
                }

            } catch (Exception e) {
                log.error("❌ Error saat menjalankan jadwal id={} type={}: {}", s.getId(), s.getType(), e.getMessage(),
                        e);
            }
        }
    }

    // ▶️ Jalankan satu jadwal (normal)
    public void runSchedule(NotificationSchedule schedule) {
        runSchedule(schedule, false);
    }

    /**
     * Versi force:
     * - force=true → abaikan active/time/lastRun; tetap lock per-type.
     */
    public void runSchedule(NotificationSchedule schedule, boolean force) {
        if (schedule == null || schedule.getType() == null) {
            log.warn("⚠️ Jadwal kosong atau tipe null, dilewati.");
            return;
        }

        final NotificationTemplate.Code type = schedule.getType();
        final LocalDateTime now = LocalDateTime.now(ZONE);

        if (!force) {
            if (!scheduleService.isActiveToday(schedule)) {
                log.debug("⏸ Jadwal {} tidak aktif hari ini.", type);
                return;
            }
            if (!scheduleService.isTimeToRun(schedule)) {
                log.debug("🕓 Belum waktunya untuk jadwal {}", type);
                return;
            }
            if (alreadyExecutedRecently(schedule, now)) {
                log.debug("⏭ Jadwal {} sudah dieksekusi baru-baru ini (lastRun={})", type, schedule.getLastRun());
                return;
            }
        } else {
            log.info("🧭 [Force] Menjalankan jadwal {} tanpa cek active/time/lastRun", type);
        }

        if (!flag(type).compareAndSet(false, true)) {
            log.warn("⛔ {} masih berjalan, skip eksekusi paralel (force={})", type, force);
            return;
        }

        try {
            log.info("▶️ Eksekusi jadwal notifikasi {} (force={})", type, force);
            runScheduleInternal(schedule);
            scheduleService.markExecuted(schedule);
            log.info("✅ Jadwal {} selesai & ditandai executed (force={})", type, force);
        } catch (Exception e) {
            log.error("❌ Gagal menjalankan jadwal {}: {}", type, e.getMessage(), e);
        } finally {
            flag(type).set(false);
        }
    }

    // 🧭 Manual trigger (ambil schedule dari DB)
    public void runManual(NotificationTemplate.Code type) {
        log.info("🧭 [Manual Trigger] Menjalankan jadwal {}", type);

        NotificationSchedule schedule = repo.findByType(type).orElse(null);
        if (schedule == null) {
            log.warn("⚠️ Jadwal {} tidak ditemukan di database", type);
            return;
        }

        // manual → force run
        runSchedule(schedule, true);
    }

    // Core eksekusi per type
    private void runScheduleInternal(NotificationSchedule schedule) {
        NotificationTemplate.Code type = schedule.getType();

        switch (type) {
            case CERT_REMINDER -> {
                log.info("🔔 Menjalankan proses CERT_REMINDER...");
                notificationService.processCertReminder();
                log.info("✅ Proses CERT_REMINDER selesai.");
            }
            case BATCH_NOTIFICATION -> {
                // TIDAK kirim global. Batch notif hanya via tombol per-batch
                // (notifyParticipantsByBatch).
                log.info("📢 Skip BATCH_NOTIFICATION dari scheduler (gunakan trigger per-batch via UI).");
            }
            default -> log.warn("⚠️ Belum ada handler untuk tipe notifikasi {}", type);
        }
    }

    // Guard anti double-run dalam 10 menit, per hari.
    private boolean alreadyExecutedRecently(NotificationSchedule s, LocalDateTime now) {
        if (s.getLastRun() == null)
            return false;
        LocalDate lastDay = s.getLastRun().atZone(ZONE).toLocalDate();
        LocalDate today = now.toLocalDate();
        if (!today.isEqual(lastDay))
            return false;
        return now.isBefore(s.getLastRun().plusMinutes(10));
    }
}
