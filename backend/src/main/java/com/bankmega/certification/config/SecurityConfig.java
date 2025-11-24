package com.bankmega.certification.config;

import com.bankmega.certification.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // auth
                        .requestMatchers("/api/auth/**").permitAll()

                        // users
                        .requestMatchers(HttpMethod.GET, "/api/users/**").hasAnyRole("SUPERADMIN", "PIC")
                        .requestMatchers(HttpMethod.POST, "/api/users").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasRole("SUPERADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("SUPERADMIN")

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

                        // employee certifications → file endpoint khusus
                        .requestMatchers(HttpMethod.GET, "/api/employee-certifications/*/file").permitAll()
                        // kalau upload/edit/delete tetap proteksi
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

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "https://mega-certification-project.vercel.app",
                "https://843a182d52ad.ngrok-free.app"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        c.addAllowedHeader("*");
        c.setExposedHeaders(List.of("Location"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
}
