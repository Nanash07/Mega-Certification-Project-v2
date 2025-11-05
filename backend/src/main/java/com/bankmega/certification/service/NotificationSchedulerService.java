package com.bankmega.certification.service;

import com.bankmega.certification.dto.NotificationScheduleResponse;
import com.bankmega.certification.entity.NotificationTemplate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationSchedulerService {

    private final NotificationScheduleService scheduleService;
    private final NotificationService notificationService;

    private static final DateTimeFormatter HHMM = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Cek tiap menit; jalankan job yang jam-nya match.
     */
    @Scheduled(cron = "0 * * * * *") // detik=0, setiap menit
    public void tick() {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now().withSecond(0).withNano(0);
        boolean weekend = isWeekend(today);

        log.info("[Scheduler] Checking notification schedules at {}", LocalDateTime.now());

        List<NotificationScheduleResponse> schedules = scheduleService.getAll();
        if (schedules == null || schedules.isEmpty())
            return;

        for (NotificationScheduleResponse sch : schedules) {
            try {
                if (sch.getActive() == null || !sch.getActive())
                    continue;
                if (Boolean.TRUE.equals(sch.getSkipWeekend()) && weekend)
                    continue;

                String timeStr = sch.getTime();
                if (timeStr == null || timeStr.isBlank())
                    continue;

                LocalTime runAt;
                try {
                    runAt = LocalTime.parse(timeStr, HHMM);
                } catch (Exception e) {
                    log.warn("Invalid schedule time {} for type {}", timeStr, sch.getType());
                    continue;
                }

                if (now.equals(runAt)) {
                    log.info("Jadwal {} waktunya jalan (now={}, target={})",
                            sch.getType(), now.format(HHMM), timeStr);
                    execute(sch.getType(), false);
                    scheduleService.markExecuted(sch.getType()); // last_run
                }
            } catch (Exception ex) {
                log.error("Scheduler error for {}: {}", sch.getType(), ex.getMessage(), ex);
            }
        }
    }

    /**
     * Run Now dari controller: langsung eksekusi tanpa cek jam/active.
     */
    public void runManual(NotificationTemplate.Code type) {
        log.info("[Manual Trigger] Menjalankan jadwal {}", type);
        // optional: validasi/ambil jadwal by type untuk logging konsisten
        try {
            scheduleService.getByType(type);
        } catch (Exception ignored) {
        }
        log.info("[Force] Menjalankan jadwal {} tanpa cek active/time/lastRun", type);

        execute(type, true);
        scheduleService.markExecuted(type);
        log.info("Jadwal {} selesai & ditandai executed (force=true)", type);
    }

    // ================= internal =================

    private void execute(NotificationTemplate.Code type, boolean force) {
        log.info("{} Eksekusi jadwal notifikasi {} (force={})",
                force ? "[Manual]" : "[Auto]", type, force);

        switch (type) {
            case CERT_REMINDER -> {
                notificationService.processCertReminder();
                log.info("Handler CERT_REMINDER executed.");
            }
            case EXPIRED_NOTICE -> {
                // Handler expired - PENTING
                notificationService.processCertExpired();
                log.info("Handler EXPIRED_NOTICE executed.");
            }
            case BATCH_NOTIFICATION -> {
                // Biasanya trigger per-batch; skip eksekusi global
                log.info("BATCH_NOTIFICATION is not executed globally via scheduler.");
            }
            default -> log.warn("Unsupported schedule type: {}", type);
        }
    }

    private boolean isWeekend(LocalDate d) {
        DayOfWeek w = d.getDayOfWeek();
        return (w == DayOfWeek.SATURDAY || w == DayOfWeek.SUNDAY);
    }
}
