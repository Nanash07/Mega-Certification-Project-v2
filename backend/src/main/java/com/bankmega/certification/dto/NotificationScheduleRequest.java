package com.bankmega.certification.dto;

import com.bankmega.certification.entity.NotificationTemplate;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationScheduleRequest {
    private NotificationTemplate.Code type;
    private Boolean active;
    private String time;
    private Boolean skipWeekend;
    private String updatedBy;
}
