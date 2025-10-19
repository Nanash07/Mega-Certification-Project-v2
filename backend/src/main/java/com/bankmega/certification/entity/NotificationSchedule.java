package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notification_schedules")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Jenis notifikasi yang diatur (CERT_REMINDER, BATCH_NOTIFICATION, dll)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50, unique = true)
    private NotificationTemplate.Code type;

    @Builder.Default
    // Apakah scheduler aktif
    @Column(nullable = false)
    private Boolean active = true;

    // Format jam (contoh: 08:00)
    @Column(nullable = false, length = 10)
    private String time;

    @Builder.Default
    // Kalau true, tidak kirim notifikasi di hari Sabtu/Minggu
    @Column(name = "skip_weekend", nullable = false)
    private Boolean skipWeekend = true;

    // Terakhir kali scheduler ini dijalankan
    @Column(name = "last_run")
    private LocalDateTime lastRun;

    // Admin yang terakhir mengubah jadwal
    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    // Timestamp kapan jadwal diubah
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
