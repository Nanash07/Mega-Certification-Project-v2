package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class NotificationRequest {

    private Long userId;
    private String userEmail;
    private String title;
    private String message;

    // optional
    private String relatedEntity;
    private Long relatedEntityId;
}
