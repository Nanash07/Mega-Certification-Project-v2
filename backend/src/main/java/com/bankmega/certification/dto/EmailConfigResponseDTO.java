package com.bankmega.certification.dto;

import lombok.*;
import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailConfigResponseDTO {
    private Long id;
    private String host;
    private Integer port;
    private String username;
    private Boolean useTls;
    private Boolean active;
    private Instant createdAt;
    private Instant updatedAt;
}
