package com.bankmega.certification.dto.dashboard;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PriorityRow {
    private String nip;
    private String name;
    private String rule;
    private String status; // "DUE" / "EXPIRED"
    private LocalDate validUntil;
    private Long daysLeft; // bisa negatif untuk EXPIRED
}
