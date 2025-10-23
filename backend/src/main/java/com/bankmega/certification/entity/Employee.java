package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class Employee {

    public enum EmploymentStatus {
        ACTIVE, RESIGN, MUTASI
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nip;

    @Column(nullable = false)
    private String name;

    @Column
    private String email;

    @Column(length = 10)
    private String gender;

    // 🔗 langsung ke Regional
    @ManyToOne
    @JoinColumn(name = "regional_id")
    private Regional regional;

    // 🔗 langsung ke Division
    @ManyToOne
    @JoinColumn(name = "division_id")
    private Division division;

    // 🔗 langsung ke Unit
    @ManyToOne
    @JoinColumn(name = "unit_id")
    private Unit unit;

    // 🔗 langsung ke Job Position
    @ManyToOne
    @JoinColumn(name = "job_position_id")
    private JobPosition jobPosition;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "status", nullable = false)
    private String status; // ACTIVE / RESIGN / MUTASI

    @Column(name = "photo_url")
    private String photoUrl;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;
}
