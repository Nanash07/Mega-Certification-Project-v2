package com.bankmega.certification.dto;

import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.EmployeeCertificationHistory;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeCertificationHistoryResponse {
    private Long id;
    private Long certificationId;

    // 🔹 Employee snapshot
    private Long employeeId;
    private String employeeNip;
    private String employeeName;
    private String jobPositionTitle;

    // 🔹 Certification Rule snapshot
    private Long certificationRuleId;
    private String certificationName;
    private String certificationCode;
    private String certificationLevelName;
    private Integer certificationLevelLevel;
    private String subFieldCode;
    private String subFieldName;

    // 🔹 Institution snapshot
    private Long institutionId;
    private String institutionName;

    // 🔹 Certification detail
    private String certNumber;
    private LocalDate certDate;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private LocalDate reminderDate;

    // 🔹 File snapshot
    private String fileUrl;
    private String fileName;
    private String fileType;

    // 🔹 Status & process
    private EmployeeCertification.Status status;

    // 🔹 Action log
    private EmployeeCertificationHistory.ActionType actionType;
    private Instant actionAt;
}