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

    private Instant createdAt;
    private Instant updatedAt;
    private Instant deletedAt;
}