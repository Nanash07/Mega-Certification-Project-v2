package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Entity
@Table(name = "employees", indexes = {
        @Index(name = "idx_employees_nip", columnList = "nip"),
        @Index(name = "idx_employees_name", columnList = "name"),
        @Index(name = "idx_employees_deleted", columnList = "deleted_at")
})
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

    @Column(name = "status", nullable = false)
    private String status;

    @CreatedDate
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<EmployeePosition> positions = new ArrayList<>();

    public EmployeePosition getPrimaryPosition() {
        if (positions == null)
            return null;
        return positions.stream()
                .filter(p -> p.getPositionType() == EmployeePosition.PositionType.PRIMARY && p.getDeletedAt() == null)
                .findFirst().orElse(null);
    }

    public EmployeePosition getSecondaryPosition() {
        if (positions == null)
            return null;
        return positions.stream()
                .filter(p -> p.getPositionType() == EmployeePosition.PositionType.SECONDARY && p.getDeletedAt() == null)
                .findFirst().orElse(null);
    }

    public List<JobPosition> getAllActiveJobPositions() {
        if (positions == null)
            return List.of();
        return positions.stream()
                .filter(p -> p.getDeletedAt() == null && Boolean.TRUE.equals(p.getIsActive()))
                .map(EmployeePosition::getJobPosition)
                .filter(Objects::nonNull)
                .toList();
    }
}
