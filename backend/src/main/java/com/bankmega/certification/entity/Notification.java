package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notifications_user", columnList = "user_id"),
        @Index(name = "idx_notifications_is_read", columnList = "is_read")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(length = 255, nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Builder.Default
    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Builder.Default
    @Column(name = "success")
    private Boolean success = true;

    @Column(name = "error_message")
    private String errorMessage;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", length = 50)
    private Type type;

    @Column(name = "related_entity")
    private String relatedEntity;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // 🔹 ENUM notifikasi
    public enum Type {
        CERT_REMINDER,
        BATCH_NOTIFICATION,
        EXPIRED_NOTICE
    }
}
