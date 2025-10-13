package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // penerima notifikasi (biasanya FK ke users.id)
    @Column(nullable = false)
    private Long recipientId;

    // judul singkat notifikasi
    @Column(length = 255, nullable = false)
    private String title;

    // isi notifikasi lengkap
    @Column(columnDefinition = "TEXT", nullable = false)
    private String message;

    @Builder.Default
    @Column(nullable = false)
    private Boolean readStatus = false;

    private LocalDateTime readAt;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    // optional: buat arahkan ke entity tertentu (misal batch atau sertifikat)
    private String relatedEntity;
    private Long relatedEntityId;
}
