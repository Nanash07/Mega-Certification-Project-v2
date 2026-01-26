package com.bankmega.certification.config;

import com.bankmega.certification.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.XXssProtectionHeaderWriter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                // cors handled by CorsFilterConfig (global)
                .cors(cors -> {
                })
                // Configure headers - allow iframe for file preview
                .headers(headers -> headers
                        .frameOptions(frameOptions -> frameOptions.sameOrigin())
                        .xssProtection(
                                xss -> xss.headerValue(XXssProtectionHeaderWriter.HeaderValue.ENABLED_MODE_BLOCK)))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // preflight MUST pass
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // auth endpoints public
                        .requestMatchers("/api/auth/**").permitAll()

                        // employee certifications file endpoint - require authentication
                        // (removed permitAll for security - files should not be publicly accessible)
                        .requestMatchers(HttpMethod.GET, "/api/employee-certifications/*/file").authenticated()

                        // roles
                        .requestMatchers(HttpMethod.GET, "/api/roles/**").hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.POST, "/api/roles").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/roles/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/roles/**").hasRole("SUPERADMIN")

                        // certifications
                        .requestMatchers(HttpMethod.GET, "/api/certifications/**").hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.POST, "/api/certifications").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/certifications/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/certifications/**").hasRole("SUPERADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/employee-certifications/**")
                        .hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.PUT, "/api/employee-certifications/**")
                        .hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.DELETE, "/api/employee-certifications/**")
                        .hasAnyRole("SUPERADMIN", "PIC")

                        // pic scopes
                        .requestMatchers(HttpMethod.POST, "/api/pic-scopes").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/pic-scopes/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/pic-scopes/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/pic-scopes/user/**").hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.GET, "/api/pic-scopes").hasRole("SUPERADMIN")

                        .anyRequest().authenticated());

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
