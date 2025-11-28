package com.bankmega.certification.dto.dashboard;

import java.time.LocalDate;
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

    private List<Long> allowedCertificationIds;

    /** filter tanggal untuk data yang pakai tabel batches */
    private LocalDate startDate;
    private LocalDate endDate;
    private String batchType;

    private Long employeeId;
}
