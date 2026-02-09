package com.bankmega.certification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class EmployeeEligibilityExceptionResponse {
    private Long id;
    private Long employeeId;
    private String employeeName;
    private String nip;
    private Long jobPositionId;
    private String jobPositionTitle;

    private Long certificationRuleId;
    private String certificationCode;
    private String certificationName;
    private String certificationLevelName;
    private Integer certificationLevelLevel;
    private String subFieldName;
    private String subFieldCode;

    private Boolean isActive;
    private String notes;

    private LocalDate targetMemiliki;
    private LocalDate expiredDate;
    private LocalDate reminderDate;

    private Instant createdAt;
    private Instant updatedAt;
}