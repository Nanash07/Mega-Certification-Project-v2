package com.bankmega.certification.dto;

import lombok.*;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeResponse {
    private Long id;
    private String nip;
    private String name;
    private String email;
    private String gender;

    private Long regionalId;
    private String regionalName;

    private Long divisionId;
    private String divisionName;

    private Long unitId;
    private String unitName;

    private Long jobPositionId;
    private String jobName;

    private LocalDate effectiveDate;
    private String status;

    private Long regionalId2;
    private String regionalName2;

    private Long divisionId2;
    private String divisionName2;

    private Long unitId2;
    private String unitName2;

    private Long jobPositionId2;
    private String jobName2;

    private LocalDate effectiveDate2;

    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
}