// src/main/java/com/bankmega/certification/dto/TestEmailRequest.java
package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class TestEmailRequest {
    private String email;
    private String subject;
    private String message;
}
