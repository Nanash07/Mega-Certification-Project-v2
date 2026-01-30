package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "job_certification_mapping_histories", indexes = {
        @Index(name = "idx_jcmh_mapping", columnList = "mapping_id"),
        @Index(name = "idx_jcmh_action", columnList = "action_type"),
        @Index(name = "idx_jcmh_date", columnList = "action_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class JobCertificationMappingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🔗 Relasi ke mapping utama
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "mapping_id")
    private JobCertificationMapping mapping;

    @Column(name = "job_name")
    private String jobName;

    @Column(name = "certification_code")
    private String certificationCode;

    @Column(name = "certification_level")
    private Integer certificationLevel;

    @Column(name = "sub_field_code")
    private String subFieldCode;

    @Column(name = "is_active")
    private Boolean isActive;

    @Enumerated(EnumType.STRING)
    @Column(name = "action_type")
    private ActionType actionType;

    @CreatedDate
    @Column(name = "action_at", updatable = false)
    private Instant actionAt;

    public enum ActionType {
        CREATED, UPDATED, TOGGLED, DELETED
    }
}
