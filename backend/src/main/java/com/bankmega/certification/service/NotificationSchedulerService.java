package com.bankmega.certification.service;

import com.bankmega.certification.entity.NotificationSchedule;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.repository.NotificationScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSchedulerService {

    private final NotificationScheduleRepository repo;
    private final NotificationScheduleService scheduleService;
    private final NotificationService notificationService;

    // ================== MAIN SCHEDULER ==================
    /**
     * Scheduler utama, jalan setiap 1 menit (cron: detik=0)
     */
    @Scheduled(cron = "0 * * * * *")
    public void runAllSchedules() {
        log.info("🕐 [Scheduler] Checking all notification schedules at {}", LocalDateTime.now());

        List<NotificationSchedule> schedules = repo.findAll();

        if (schedules.isEmpty()) {
            log.info("ℹ️ Tidak ada jadwal notifikasi yang terdaftar di database.");
            return;
        }

        for (NotificationSchedule s : schedules) {
            try {
                if (!scheduleService.isActiveToday(s))
                    continue;
                if (!scheduleService.isTimeToRun(s))
                    continue;

                log.info("🚀 Menjalankan jadwal notifikasi untuk {}", s.getType());
                runSchedule(s);

                scheduleService.markExecuted(s);

            } catch (Exception e) {
                log.error("❌ Error saat menjalankan jadwal {}: {}", s.getType(), e.getMessage(), e);
            }
        }
    }

    // ================== JALANKAN SATU JADWAL ==================
    public void runSchedule(NotificationSchedule schedule) {
        if (schedule == null || schedule.getType() == null) {
            log.warn("⚠️ Jadwal kosong atau type null, dilewati.");
            return;
        }

        NotificationTemplate.Code type = schedule.getType();
        log.info("▶️ Eksekusi jadwal notifikasi {}", type);

        try {
            switch (type) {
                case CERT_REMINDER -> {
                    log.info("🔔 Menjalankan proses CERT_REMINDER...");
                    notificationService.processCertReminder();
                }
                case BATCH_NOTIFICATION -> {
                    log.info("📢 Menjalankan proses BATCH_NOTIFICATION...");
                    notificationService.processBatchNotification();
                }
                default -> log.warn("⚠️ Belum ada handler untuk tipe notifikasi {}", type);
            }
        } catch (Exception e) {
            log.error("❌ Gagal menjalankan jadwal {}: {}", type, e.getMessage(), e);
        }
    }

    // ================== RUN MANUAL DARI CONTROLLER ==================
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
