package com.bankmega.certification.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeRequest {
    private String nip;
    private String name;
    private String email;
    private String gender;

    private Long regionalId;
    private Long divisionId;
    private Long unitId;
    private Long jobPositionId;
    private LocalDate effectiveDate;

    private Long regionalId2;
    private Long divisionId2;
    private Long unitId2;
    private Long jobPositionId2;
    private LocalDate effectiveDate2;

    private String status;
}