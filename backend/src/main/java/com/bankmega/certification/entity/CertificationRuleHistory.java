package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "certification_rule_histories", indexes = {
        @Index(name = "idx_crh_rule", columnList = "certification_rule_id"),
        @Index(name = "idx_crh_action", columnList = "action_type"),
        @Index(name = "idx_crh_date", columnList = "action_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class CertificationRuleHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔹 Relasi ke rule utama
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "certification_rule_id", nullable = false)
    private CertificationRule certificationRule;

    // 🔹 Snapshot certification
    private Long certificationId;
    private String certificationName;
    private String certificationCode;

    // 🔹 Snapshot level
    private Long certificationLevelId;
    private String certificationLevelName;
    private Integer certificationLevelLevel;

    // 🔹 Snapshot subfield
    private Long subFieldId;
    private String subFieldCode;
    private String subFieldName;

    // 🔹 Rule detail
    private Integer validityMonths;
    private Integer reminderMonths;
    private Integer wajibSetelahMasuk;

    private Boolean isActive;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type", length = 20, nullable = false)
    private ActionType actionType;

    @CreatedDate
    @Column(name = "action_at", nullable = false, updatable = false)
    private Instant actionAt;

    public enum ActionType {
        CREATED,
        UPDATED,
        DELETED
    }
}
