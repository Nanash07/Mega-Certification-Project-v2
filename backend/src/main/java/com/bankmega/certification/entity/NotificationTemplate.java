package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_templates")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "code", unique = true, nullable = false, length = 100)
    private Code code; // e.g. CERT_REMINDER, BATCH_NOTIFICATION

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String body;

    @Column(name = "updated_by")
    private String updatedBy;

    @Column(name = "updated_at")
    private java.time.LocalDateTime updatedAt;

    public enum Code {
        CERT_REMINDER, // 🔔 Pengingat sertifikasi mau habis
        BATCH_NOTIFICATION,
        EXPIRED_NOTICE
    }
}
