package com.bankmega.certification.repository;

import com.bankmega.certification.entity.NotificationSchedule;
import com.bankmega.certification.entity.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationScheduleRepository extends JpaRepository<NotificationSchedule, Long> {
    Optional<NotificationSchedule> findByType(NotificationTemplate.Code type);
}
