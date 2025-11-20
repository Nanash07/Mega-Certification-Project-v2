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
    private String status;
}