package com.bankmega.certification.dto;

import lombok.Data;

@Data
public class ForgotPasswordRequest {
    private String email;
    private String username;
}
