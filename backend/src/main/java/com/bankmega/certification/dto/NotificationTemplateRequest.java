package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class NotificationTemplateRequest {

    private String title;
    private String body;
    private String updatedBy;
}
