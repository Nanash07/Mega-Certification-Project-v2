package com.bankmega.certification.service;

import com.bankmega.certification.entity.NotificationSchedule;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.repository.NotificationScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSchedulerService {

    private final NotificationScheduleRepository repo;
    private final NotificationScheduleService scheduleService;
    private final NotificationService notificationService;

    /**
     * 🕐 Scheduler utama — jalan tiap 5 menit (hemat log & resource)
     * - Cek semua jadwal aktif di DB
     * - Jalanin hanya yang waktunya cocok dan belum dieksekusi hari ini
     */
    @Scheduled(cron = "0 */5 * * * *") // tiap 5 menit
    public void runAllSchedules() {
        LocalDateTime now = LocalDateTime.now();
        log.info("🕐 [Scheduler] Checking notification schedules at {}", now);

        List<NotificationSchedule> schedules = repo.findAll();
        if (schedules.isEmpty()) {
            log.info("ℹ️ Tidak ada jadwal notifikasi di database.");
            return;
        }

        for (NotificationSchedule s : schedules) {
            try {
                log.debug("🔍 Evaluating schedule {} (active={}, time={}, lastRun={})",
                        s.getType(), s.getActive(), s.getTime(), s.getLastRun());

                // Skip kalau jadwal tidak aktif / weekend
                if (!scheduleService.isActiveToday(s)) {
                    log.debug("⏸ Jadwal {} tidak aktif / skip weekend", s.getType());
                    continue;
                }

                // Skip kalau belum waktunya
                if (!scheduleService.isTimeToRun(s)) {
                    log.debug("🕓 Belum waktunya untuk jadwal {}", s.getType());
                    continue;
                }

                // Skip kalau sudah dijalankan hari ini
                if (s.getLastRun() != null &&
                        s.getLastRun().toLocalDate().isEqual(LocalDate.now()) &&
                        LocalDateTime.now().isBefore(s.getLastRun().plusMinutes(10))) {
                    log.debug("⏭ Jadwal {} sudah dijalankan hari ini (lastRun={})", s.getType(), s.getLastRun());
                    continue;
                }

                // ✅ Jalankan jadwal
                log.info("🚀 Menjalankan jadwal notifikasi untuk {}", s.getType());
                runSchedule(s);

                // ✅ Tandai sudah dieksekusi
                scheduleService.markExecuted(s);
                log.info("✅ Jadwal {} berhasil dijalankan dan ditandai executed", s.getType());

            } catch (Exception e) {
                log.error("❌ Error saat menjalankan jadwal {}: {}", s.getType(), e.getMessage(), e);
            }
        }
    }

    /**
     * ▶️ Jalankan satu jadwal berdasarkan tipe notifikasi
     */
    public void runSchedule(NotificationSchedule schedule) {
        if (schedule == null || schedule.getType() == null) {
            log.warn("⚠️ Jadwal kosong atau tipe null, dilewati.");
            return;
        }

        NotificationTemplate.Code type = schedule.getType();
        log.info("▶️ Eksekusi jadwal notifikasi {}", type);

        try {
            switch (type) {
                case CERT_REMINDER -> {
                    log.info("🔔 Menjalankan proses CERT_REMINDER...");
                    notificationService.processCertReminder();
                    log.info("✅ Proses CERT_REMINDER selesai.");
                }
                case BATCH_NOTIFICATION -> {
                    log.info("📢 Menjalankan proses BATCH_NOTIFICATION...");
                    notificationService.processBatchNotification();
                    log.info("✅ Proses BATCH_NOTIFICATION selesai.");
                }
                default -> log.warn("⚠️ Belum ada handler untuk tipe notifikasi {}", type);
            }
        } catch (Exception e) {
            log.error("❌ Gagal menjalankan jadwal {}: {}", type, e.getMessage(), e);
        }
    }

    /**
     * 🧭 Manual trigger dari controller
     */
    public void runManual(NotificationTemplate.Code type) {
        log.info("🧭 [Manual Trigger] Menjalankan jadwal {}", type);

        NotificationSchedule schedule = repo.findByType(type).orElse(null);
        if (schedule == null) {
            log.warn("⚠️ Jadwal {} tidak ditemukan di database", type);
            return;
        }

        try {
            runSchedule(schedule);
            scheduleService.markExecuted(schedule);
            log.info("✅ [Manual Trigger] Jadwal {} berhasil dijalankan", type);
        } catch (Exception e) {
            log.error("❌ [Manual Trigger] Gagal menjalankan jadwal {}: {}", type, e.getMessage(), e);
        }
    }
}
