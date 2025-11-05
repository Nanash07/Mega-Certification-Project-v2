package com.bankmega.certification.dto.dashboard;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MonthlyPoint {
    private int month; // 1..12
    private long count;
}
