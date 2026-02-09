package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class EmployeeEligibilityExceptionRequest {
    private Long employeeId;
    private Long certificationRuleId;
    private Long jobPositionId; // optional: specific job position
    private String notes;
}