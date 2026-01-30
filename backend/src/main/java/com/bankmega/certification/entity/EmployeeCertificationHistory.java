package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employee_certification_histories", indexes = {
        @Index(name = "idx_ech_cert_id", columnList = "employee_certification_id"),
        @Index(name = "idx_ech_emp_id", columnList = "employeeId"),
        @Index(name = "idx_ech_rule_id", columnList = "certificationRuleId"),
        @Index(name = "idx_ech_action", columnList = "actionType"),
        @Index(name = "idx_ech_date", columnList = "actionAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class EmployeeCertificationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relasi ke sertifikat utama
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_certification_id", nullable = false)
    private EmployeeCertification employeeCertification;

    // 🔹 Snapshot data pegawai
    private Long employeeId;
    private String employeeNip;
    private String employeeName;
    private String jobPositionTitle;

    // 🔹 Snapshot rule sertifikasi
    private Long certificationRuleId;
    private String certificationName;
    private String certificationCode;
    private String certificationLevelName;
    private Integer certificationLevelLevel;
    private String subFieldCode;
    private String subFieldName;

    // 🔹 Snapshot institusi
    private Long institutionId;
    private String institutionName;

    // 🔹 Snapshot detail sertifikat
    private String certNumber;
    private LocalDate certDate;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private LocalDate reminderDate;

    // 🔹 File snapshot
    private String fileUrl;
    private String fileName;
    private String fileType;

    // 🔹 Status & proses
    @Enumerated(EnumType.STRING)
    private EmployeeCertification.Status status;

    // 🔹 Action info
    @Enumerated(EnumType.STRING)
    private ActionType actionType;

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private Instant actionAt;

    public enum ActionType {
        CREATED,
        UPDATED,
        DELETED,
        UPLOAD_CERTIFICATE,
        REUPLOAD_CERTIFICATE,
        DELETE_CERTIFICATE
    }
}
