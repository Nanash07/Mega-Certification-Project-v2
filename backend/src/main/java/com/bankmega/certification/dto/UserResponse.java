package com.bankmega.certification.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponse {

    private Long id;
    private String username;
    private String email;

    private Long roleId;
    private String roleName;

    private Long employeeId;
    private String employeeNip;
    private String employeeName;
    private Long employeeJobPositionId;
    private String employeeJobPositionName;

    private Boolean isActive;
    private Boolean isFirstLogin;

    private String createdAt;
    private String updatedAt;
}
