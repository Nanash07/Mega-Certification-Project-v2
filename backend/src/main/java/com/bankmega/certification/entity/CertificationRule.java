package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;

@Entity
@Table(name = "certification_rules", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "certification_id", "level_id", "sub_field_id" })
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class CertificationRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "certification_id", nullable = false)
    private Certification certification;

    @ManyToOne
    @JoinColumn(name = "certification_level_id")
    private CertificationLevel certificationLevel;

    @ManyToOne
    @JoinColumn(name = "sub_field_id")
    private SubField subField;

    @Column(name = "validity_months")
    private Integer validityMonths;

    @Column(name = "reminder_months")
    private Integer reminderMonths;

    @ManyToOne
    @JoinColumn(name = "refreshment_type_id")
    private RefreshmentType refreshmentType;

    @Column(name = "wajib_setelah_masuk")
    private Integer wajibSetelahMasuk; // dalam bulan

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}