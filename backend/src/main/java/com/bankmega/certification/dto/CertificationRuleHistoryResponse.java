package com.bankmega.certification.dto;

import com.bankmega.certification.entity.CertificationRuleHistory;
import lombok.*;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationRuleHistoryResponse {

    private Long id;

    // 🔹 Relasi ke CertificationRule
    private Long certificationRuleId;

    // 🔹 Snapshot certification
    private Long certificationId;
    private String certificationName;
    private String certificationCode;

    // 🔹 Snapshot level
    private Long certificationLevelId;
    private String certificationLevelName;
    private Integer certificationLevelLevel;

    // 🔹 Snapshot subfield
    private Long subFieldId;
    private String subFieldCode;
    private String subFieldName;

    // 🔹 Rule detail
    private Integer validityMonths;
    private Integer reminderMonths;
    private Integer wajibSetelahMasuk;

    private Boolean isActive;

    // 🔹 Audit action
    private CertificationRuleHistory.ActionType actionType;
    private Instant actionAt;
}