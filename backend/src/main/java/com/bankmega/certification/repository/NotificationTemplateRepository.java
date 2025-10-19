package com.bankmega.certification.repository;

import com.bankmega.certification.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, Long> {
    Optional<NotificationTemplate> findByCode(NotificationTemplate.Code code);
}
