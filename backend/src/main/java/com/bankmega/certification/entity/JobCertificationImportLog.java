package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "job_certification_import_logs", indexes = {
        @Index(name = "idx_jcil_user", columnList = "user_id"),
        @Index(name = "idx_jcil_date", columnList = "createdAt")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobCertificationImportLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // asumsi User entity sudah ada

    private String fileName;
    private int totalProcessed;
    private int totalInserted;
    private int totalReactivated;
    private int totalSkipped;
    private int totalErrors;
    private boolean dryRun;

    @Builder.Default
    @Column(updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
