package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    long countByUserIdAndIsReadFalse(Long userId);

    // 🔹 Tambahin ini biar gak error
    List<Notification> findByTypeAndRelatedEntity(
            Notification.Type type,
            String relatedEntity);
}
