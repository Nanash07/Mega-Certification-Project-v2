// src/main/java/com/bankmega/certification/dto/EmployeeHistoryResponse.java
package com.bankmega.certification.dto;

import com.bankmega.certification.entity.EmployeeHistory;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class EmployeeHistoryResponse {

    private Long id;

    private Long employeeId;
    private String employeeNip;
    private String employeeName;

    private String oldJobTitle;
    private String oldUnitName;
    private String oldDivisionName;
    private String oldRegionalName;

    private String newJobTitle;
    private String newUnitName;
    private String newDivisionName;
    private String newRegionalName;

    private LocalDate effectiveDate;
    private EmployeeHistory.EmployeeActionType actionType;
    private String positionType;
    private Instant actionAt;
}
