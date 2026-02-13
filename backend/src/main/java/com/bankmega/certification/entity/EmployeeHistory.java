package com.bankmega.certification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "employee_histories", indexes = {
        @Index(name = "idx_eh_employee", columnList = "employee_id"),
        @Index(name = "idx_eh_action_type", columnList = "action_type"),
        @Index(name = "idx_eh_action_at", columnList = "action_at"),
        @Index(name = "idx_eh_effective_date", columnList = "effective_date")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FK ke employee utama
    @ManyToOne
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    // 🔹 Snapshot data pegawai
    private String employeeNip; // simpan NIP langsung
    private String employeeName; // simpan nama langsung

    // FK posisi lama & baru
    @ManyToOne
    @JoinColumn(name = "old_job_position_id")
    private JobPosition oldJobPosition;

    @ManyToOne
    @JoinColumn(name = "new_job_position_id")
    private JobPosition newJobPosition;

    // Snapshot lama
    private String oldJobTitle;
    private String oldUnitName;
    private String oldDivisionName;
    private String oldRegionalName;

    // Snapshot baru
    private String newJobTitle;
    private String newUnitName;
    private String newDivisionName;
    private String newRegionalName;

    private LocalDate effectiveDate; // tanggal SK efektif

    // 🔹 Enum actionType disimpan sebagai String
    @Enumerated(EnumType.STRING)
    private EmployeeActionType actionType;

    @Column(name = "position_type", length = 20)
    private String positionType;

    private Instant actionAt;

    // 🔹 Inner Enum
    public enum EmployeeActionType {
        CREATED,
        UPDATED,
        DELETED
    }
}
