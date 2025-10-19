package com.bankmega.certification.dto;

import com.bankmega.certification.entity.NotificationTemplate;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateResponse {
    private Long id;
    private NotificationTemplate.Code code;
    private String title;
    private String body;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
