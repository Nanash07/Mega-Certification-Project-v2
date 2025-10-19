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
    private String type; // tambahin biar FE bisa bedain CERT_REMINDER, BATCH_NOTIFICATION
}
