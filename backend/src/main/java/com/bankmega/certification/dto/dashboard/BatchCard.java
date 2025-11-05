package com.bankmega.certification.dto.dashboard;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchCard {
    private Long id;
    private String name;
    private String type;
    private String status;

    private LocalDate startDate;
    private LocalDate endDate;

    private Integer quota;
    private int registeredOrAttended;
    private int passed;
    private int failed;

    String certificationCode;
    Integer certificationLevelLevel;
    String subFieldCode;
}
