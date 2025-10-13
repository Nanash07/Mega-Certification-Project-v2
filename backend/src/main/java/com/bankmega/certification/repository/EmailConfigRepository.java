package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmailConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailConfigRepository extends JpaRepository<EmailConfig, Long> {

    // Ambil konfigurasi yang sedang aktif
    Optional<EmailConfig> findByActiveTrue();
}
