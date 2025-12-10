// src/main/java/com/bankmega/certification/dto/FirstLoginChangePasswordRequest.java
package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class FirstLoginChangePasswordRequest {

    private String username;
    private String newPassword;
}
