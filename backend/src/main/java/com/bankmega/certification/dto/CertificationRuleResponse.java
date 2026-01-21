package com.bankmega.certification.dto;

import java.time.Instant;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationRuleResponse {

    private Long id;

    private Long certificationId;
    private String certificationName;
    private String certificationCode;

    private Long certificationLevelId;
    private String certificationLevelName;
    private Integer certificationLevelLevel;

    private Long subFieldId;
    private String subFieldName;
    private String subFieldCode;

    private Integer validityMonths;
    private Integer reminderMonths;

    private Integer wajibSetelahMasuk;
    private Boolean isActive;

    private Instant updatedAt;
    private Instant createdAt;
}
