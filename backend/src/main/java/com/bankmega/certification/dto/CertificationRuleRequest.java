package com.bankmega.certification.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CertificationRuleRequest {

    @NotNull
    private Long certificationId;

    private Long certificationLevelId;
    private Long subFieldId;

    @NotNull
    private Integer validityMonths;

    @NotNull
    private Integer reminderMonths;

    private Integer wajibSetelahMasuk;

    private Boolean isActive;
}