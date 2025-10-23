package com.bankmega.certification.dto;

import com.bankmega.certification.entity.Batch;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchRequest {
    private String batchName;
    private Long certificationRuleId;
    private Long institutionId;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer quota;
    private Batch.Status status;
    private Batch.BatchType type;
}
