package com.bankmega.certification.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeCertificationRequest {

    private Long employeeId;
    private Long certificationRuleId;
    private Long institutionId;

    private String certNumber;
    private LocalDate certDate;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private String fileUrl;

    private String notes;
}