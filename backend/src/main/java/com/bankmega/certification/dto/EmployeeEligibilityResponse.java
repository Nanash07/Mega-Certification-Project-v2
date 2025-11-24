package com.bankmega.certification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class EmployeeEligibilityResponse {
    private Long id;
    private Long employeeId;
    private String nip;
    private String employeeName;
    private String jobPositionTitle;
    private LocalDate effectiveDate;

    private Long certificationRuleId;
    private String certificationCode;
    private String certificationName;

    private String certificationLevelName;
    private Integer certificationLevelLevel;

    private String subFieldName;
    private String subFieldCode;

    private String status; // NOT_YET_CERTIFIED, ACTIVE, DUE, EXPIRED
    private LocalDate dueDate;
    private String source;

    private Boolean isActive;

    private LocalDate wajibPunyaSertifikasiSampai; // joinDate + wajibSetelahMasuk
    private Integer masaBerlakuBulan; // validityMonths
    private String sisaWaktu;

    private Instant createdAt;
    private Instant updatedAt;

    private Integer trainingCount;
    private Integer refreshmentCount;
    private Integer extensionCount;
}
