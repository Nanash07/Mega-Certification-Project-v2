package com.bankmega.certification.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailConfigRequestDTO {
    private String host;
    private Integer port;
    private String username;
    private String password;
    private Boolean useTls;
}
