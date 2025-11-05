package com.bankmega.certification.dto.dashboard;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SummaryDTO {
    private long employeeCount;
    private long eligiblePopulation;
    private long certifiedCount;
    private long notYetCount;
    private long dueCount;
    private long expiredCount;
    private long ongoingBatchCount;

    private double realizationPct; // (certified / eligible) * 100
}
