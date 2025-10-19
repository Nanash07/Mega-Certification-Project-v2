package com.bankmega.certification.dto;

import com.bankmega.certification.entity.NotificationTemplate;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationScheduleResponse {
    private Long id;
    private NotificationTemplate.Code type;
    private Boolean active;
    private String time;
    private Boolean skipWeekend;
    private LocalDateTime lastRun;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
