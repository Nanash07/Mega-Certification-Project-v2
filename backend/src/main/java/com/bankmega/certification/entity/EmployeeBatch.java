// src/main/java/com/bankmega/certification/entity/EmployeeBatch.java
package com.bankmega.certification.entity;

import jakarta.persistence.*;
import jakarta.persistence.Id;
import lombok.*;
import org.springframework.data.annotation.*;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employee_batches", uniqueConstraints = @UniqueConstraint(columnNames = { "batch_id", "employee_id" }))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class EmployeeBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relasi ke batch
    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    // 🔹 Relasi ke pegawai
    @ManyToOne(optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Status status;

    // ✅ NEW: snapshot jenis proses saat enroll
    @Enumerated(EnumType.STRING)
    @Column(name = "process_type", length = 20, nullable = false)
    private ProcessType processType;

    @Column(name = "registration_date")
    private LocalDate registrationDate;

    @Column(name = "attended_at")
    private LocalDate attendedAt;

    @Column(name = "result_date")
    private LocalDate resultDate;

    @Column(name = "score")
    private Integer score;

    @Column(name = "notes", length = 500)
    private String notes;

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
        REGISTERED, ATTENDED, PASSED, FAILED, CANCELED
    }

    public enum ProcessType {
        CERTIFICATION, TRAINING, REFRESHMENT, EXTENSION
    }
}
