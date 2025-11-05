package com.bankmega.certification.dto;

import com.bankmega.certification.entity.EmployeeBatch.Status;
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

    // 🔹 Data pegawai
    private Long employeeId;
    private String employeeNip;
    private String employeeName;

    // ✅ NEW: struktur organisasi & jabatan
    private String employeeJobName;
    private String employeeDivisionName;
    private String employeeRegionalName;
    private String employeeUnitName;

    // 🔹 Data batch
    private Long batchId;
    private String batchName;

    // 🔹 Status peserta
    private Status status;

    // 🔹 Detail proses
    private LocalDate registrationDate;
    private LocalDate attendedAt;
    private LocalDate resultDate;
    private String notes;

    // 🔹 Audit
    private Instant createdAt;
    private Instant updatedAt;
}
