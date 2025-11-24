package com.bankmega.certification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoginResponse {
    private Long id;
    private String username;
    private String role;
    private Long employeeId;
    private String email;
    private Boolean isFirstLogin;
    private Boolean isActive;
    private String token;
}
