package com.bankmega.certification.dto;

import com.bankmega.certification.entity.EmployeeBatch.Status;
import com.bankmega.certification.entity.EmployeeBatch.ProcessType;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeBatchResponse {

    private Long id;

    // Pegawai
    private Long employeeId;
    private String employeeNip;
    private String employeeName;

    // Org/Jabatan
    private String employeeJobName;
    private String employeeDivisionName;
    private String employeeRegionalName;
    private String employeeUnitName;

    // Batch
    private Long batchId;
    private String batchName;

    // Status + jenis proses (CERTIFICATION/TRAINING/REFRESHMENT)
    private Status status;
    private ProcessType processType;

    // Detail proses
    private LocalDate registrationDate;
    private LocalDate attendedAt;
    private LocalDate resultDate;
    private Integer score;
    private String notes;

    // Audit
    private Instant createdAt;
    private Instant updatedAt;
}
