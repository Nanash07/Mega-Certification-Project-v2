package com.bankmega.certification.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {

    private Long id;
    private String title;
    private String message;
    private boolean read;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private LocalDateTime sentAt;
    private String relatedEntity;
    private Long relatedEntityId;
    private String type; // CERT_REMINDER, EXPIRED_NOTICE, BATCH_NOTIFICATION, dll

    private Long userId; // penerima (employeeId)
    private String employeeName; // nama penerima
    private String employeeNip; // nip penerima
    private String employeeEmail; // email penerima
}
