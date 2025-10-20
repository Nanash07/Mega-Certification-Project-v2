package com.bankmega.certification.service;

import com.bankmega.certification.dto.NotificationScheduleRequest;
import com.bankmega.certification.dto.NotificationScheduleResponse;
import com.bankmega.certification.entity.NotificationSchedule;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.NotificationScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationScheduleService {

    private final NotificationScheduleRepository repo;

    // ================== GET ALL ==================
    public List<NotificationScheduleResponse> getAll() {
        log.info("📅 Mengambil semua jadwal notifikasi...");
        return repo.findAll(Sort.by(Sort.Order.asc("type")))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ================== GET BY TYPE ==================
    public NotificationScheduleResponse getByType(NotificationTemplate.Code type) {
        log.info("🔍 Mengambil jadwal notifikasi untuk {}", type);
        NotificationSchedule s = repo.findByType(type)
                .orElseThrow(() -> new NotFoundException("Jadwal untuk " + type + " tidak ditemukan"));
        return toResponse(s);
    }

    // ================== SAVE OR UPDATE ==================
    public NotificationScheduleResponse saveOrUpdate(NotificationScheduleRequest req) {
        NotificationSchedule schedule = repo.findByType(req.getType())
                .orElse(NotificationSchedule.builder().type(req.getType()).build());

        if (req.getActive() != null)
            schedule.setActive(req.getActive());
        if (req.getTime() != null)
            schedule.setTime(req.getTime().trim());
        if (req.getSkipWeekend() != null)
            schedule.setSkipWeekend(req.getSkipWeekend());

        schedule.setUpdatedBy(req.getUpdatedBy());
        schedule.setUpdatedAt(LocalDateTime.now());

        NotificationSchedule saved = repo.saveAndFlush(schedule);
        log.info("✅ Jadwal notifikasi {} berhasil disimpan/diupdate (active={}, time={}, skipWeekend={})",
                req.getType(), saved.getActive(), saved.getTime(), saved.getSkipWeekend());

        return toResponse(saved);
    }

    // ================== MAPPING ENTITY -> DTO ==================
    private NotificationScheduleResponse toResponse(NotificationSchedule s) {
        return new NotificationScheduleResponse(
                s.getId(),
                s.getType(),
                s.getActive(),
                s.getTime(),
                s.getSkipWeekend(),
                s.getLastRun(),
                s.getUpdatedBy(),
                s.getUpdatedAt());
    }

    // ================== CEK AKTIF HARI INI ==================
    public boolean isActiveToday(NotificationSchedule schedule) {
        if (schedule == null)
            return false;

        if (!Boolean.TRUE.equals(schedule.getActive())) {
            log.debug("⏸ Jadwal {} tidak aktif", schedule.getType());
            return false;
        }

        if (Boolean.TRUE.equals(schedule.getSkipWeekend())) {
            DayOfWeek today = LocalDate.now().getDayOfWeek();
            if (today == DayOfWeek.SATURDAY || today == DayOfWeek.SUNDAY) {
                log.debug("🚫 Skip weekend untuk jadwal {}", schedule.getType());
                return false;
            }
        }

        return true;
    }

    // ================== CEK WAKTU SEKARANG SESUAI JADWAL ==================
    public boolean isTimeToRun(NotificationSchedule schedule) {
        if (schedule == null || schedule.getTime() == null || schedule.getTime().isBlank()) {
            log.debug("⚠️ Jadwal {} belum punya waktu eksekusi", schedule != null ? schedule.getType() : "null");
            return false;
        }

        try {
            LocalTime now = LocalTime.now().withSecond(0).withNano(0);
            LocalTime target = LocalTime.parse(schedule.getTime().trim());

            // ⏰ Toleransi ±2 menit dari waktu target
            boolean match = now.isAfter(target.minusMinutes(2)) && now.isBefore(target.plusMinutes(2));

            if (match) {
                log.info("⏰ Jadwal {} waktunya jalan (now={}, target={})", schedule.getType(), now, target);
            }
            return match;

        } catch (DateTimeParseException e) {
            log.error("❌ Format jam invalid untuk jadwal {}: {}", schedule.getType(), schedule.getTime());
            return false;
        }
    }

    // ================== UPDATE LAST RUN ==================
    public void markExecuted(NotificationSchedule schedule) {
        if (schedule == null)
            return;

        schedule.setLastRun(LocalDateTime.now());
        repo.saveAndFlush(schedule); // ✅ langsung commit biar gak delay
        log.info("🕒 Jadwal {} ditandai sudah dieksekusi pada {}",
                schedule.getType(), schedule.getLastRun());
    }
}
