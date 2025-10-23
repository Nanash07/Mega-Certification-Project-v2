// src/main/java/com/bankmega/certification/entity/Batch.java

package com.bankmega.certification.entity;

import jakarta.persistence.*;
import jakarta.persistence.Id;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Entity
@Table(name = "batches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relasi ke aturan sertifikasi
    @ManyToOne(optional = false)
    @JoinColumn(name = "certification_rule_id", nullable = false)
    private CertificationRule certificationRule;

    // 🔹 Lembaga penyelenggara (opsional)
    @ManyToOne
    @JoinColumn(name = "institution_id")
    private Institution institution;

    @Column(name = "batch_name", nullable = false, length = 150)
    private String batchName;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "quota")
    private Integer quota;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private BatchType type;

    // 🔹 Relasi ke peserta batch
    @OneToMany(mappedBy = "batch", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<EmployeeBatch> participants;

    // 🔹 Audit
    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    public enum Status {
        PLANNED, // direncanakan
        ONGOING, // sedang berjalan
        FINISHED, // sudah selesai
        CANCELED // dibatalkan
    }

    public enum BatchType {
        CERTIFICATION,
        TRAINING,
        REFRESHMENT
    }
}