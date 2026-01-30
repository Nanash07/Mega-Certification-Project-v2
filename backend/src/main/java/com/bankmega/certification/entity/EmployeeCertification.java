package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employee_certifications", indexes = {
        @Index(name = "idx_ec_employee", columnList = "employee_id"),
        @Index(name = "idx_ec_rule", columnList = "certification_rule_id"),
        @Index(name = "idx_ec_status", columnList = "status"),
        @Index(name = "idx_ec_valid_until", columnList = "valid_until"),
        @Index(name = "idx_ec_reminder", columnList = "reminder_date"),
        @Index(name = "idx_ec_deleted", columnList = "deleted_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class EmployeeCertification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relasi ke Employee
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // 🔹 Snapshot nama jabatan saat sertifikat dibuat
    @Column(name = "job_position_title", length = 200)
    private String jobPositionTitle;

    // 🔹 Relasi ke CertificationRule (FK tetap ada buat join)
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "certification_rule_id", nullable = false)
    private CertificationRule certificationRule;

    // 🔹 Snapshot CertificationRule (supaya aturan lama tetap berlaku)
    @Column(name = "rule_validity_months")
    private Integer ruleValidityMonths;

    @Column(name = "rule_reminder_months")
    private Integer ruleReminderMonths;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "institution_id")
    private Institution institution;

    @Column(name = "cert_number", length = 100)
    private String certNumber;

    @Column(name = "cert_date")
    private LocalDate certDate;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_until")
    private LocalDate validUntil;

    @Column(name = "reminder_date")
    private LocalDate reminderDate;

    @Column(name = "file_url", length = 500)
    private String fileUrl;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_type", length = 50)
    private String fileType;

    @Enumerated(EnumType.STRING)
    @Column(length = 30, nullable = false)
    private Status status;

    // 🔹 Audit fields
    @CreatedDate
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum Status {
        NOT_YET_CERTIFIED,
        PENDING,
        ACTIVE,
        DUE,
        EXPIRED,
        INVALID
    }
}
