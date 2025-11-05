package com.bankmega.certification.dto.dashboard;

import java.util.List;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardFilters {
    private Long regionalId;
    private Long divisionId;
    private Long unitId;

    private Long certificationId;
    private Long levelId;
    private Long subFieldId;

    private Integer year; // default-in di service kalau null

    private List<Long> allowedCertificationIds;
}
