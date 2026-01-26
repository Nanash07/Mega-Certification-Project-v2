package com.bankmega.certification.controller;

import com.bankmega.certification.dto.NotificationScheduleRequest;
import com.bankmega.certification.dto.NotificationScheduleResponse;
import com.bankmega.certification.entity.NotificationTemplate;
import com.bankmega.certification.service.NotificationScheduleService;
import com.bankmega.certification.service.NotificationSchedulerService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notification-schedules")
@RequiredArgsConstructor
public class NotificationScheduleController {

    private final NotificationScheduleService scheduleService;
    private final NotificationSchedulerService schedulerService;

    // ================== AMBIL SEMUA JADWAL ==================
    @GetMapping
    public List<NotificationScheduleResponse> getAll() {
        return scheduleService.getAll();
    }

    // ================== AMBIL JADWAL BERDASARKAN TYPE ==================
    @GetMapping("/{type}")
    public NotificationScheduleResponse getByType(@PathVariable NotificationTemplate.Code type) {
        return scheduleService.getByType(type);
    }

    // ================== SIMPAN / UPDATE JADWAL ==================
    @PostMapping
    public NotificationScheduleResponse saveOrUpdate(@RequestBody NotificationScheduleRequest req) {
        return scheduleService.saveOrUpdate(req);
    }

    // ================== JALANKAN MANUAL (RUN NOW) ==================
    @PostMapping("/run-now/{type}")
    public void runNow(@PathVariable NotificationTemplate.Code type) {
        schedulerService.runManual(type);
    }

}

    