package com.bankmega.certification.config;

import com.bankmega.certification.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    /**
     * Set di ENV Railway:
     * APP_CORS_ALLOWED_ORIGINS=https://mega-certification-project-v2-1ogr.vercel.app,https://*.vercel.app,http://localhost:5173
     */
    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS & CSRF
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // JWT stateless
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Authorization
                .authorizeHttpRequests(auth -> auth
                        // preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // auth
                        .requestMatchers("/api/auth/**").permitAll()

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

        // Parse comma-separated origins/patterns
        List<String> originPatterns = Arrays.stream(allowedOrigins.split("\\s*,\\s*"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());

        // IMPORTANT:
        // - Pakai allowedOriginPatterns supaya bisa dukung https://*.vercel.app
        // - Kalau lu pakai Bearer token (Authorization header) dan BUKAN cookie,
        // lebih aman bikin allowCredentials(false).
        c.setAllowedOriginPatterns(originPatterns);

        c.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));

        // allow headers yg umum dipakai FE
        c.setAllowedHeaders(List.of(
                "Authorization",
                "Content-Type",
                "Accept",
                "Origin",
                "X-Requested-With"));

        // kalau FE butuh baca header tertentu dari response
        c.setExposedHeaders(List.of("Location"));

        // Karena lu pakai Bearer token (localStorage) -> ga perlu cookie
        c.setAllowCredentials(false);

        // Optional: cache preflight (detik)
        c.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }
}
