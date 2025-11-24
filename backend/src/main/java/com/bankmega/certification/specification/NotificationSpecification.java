package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Notification;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;

public class NotificationSpecification {

    public static Specification<Notification> byUser(Long userId) {
        return (root, query, cb) -> userId == null ? cb.conjunction() : cb.equal(root.get("userId"), userId);
    }

    public static Specification<Notification> unreadOnly(Boolean unread) {
        return (root, query, cb) -> {
            if (unread == null || !unread)
                return cb.conjunction();
            return cb.isFalse(root.get("isRead"));
        };
    }

    public static Specification<Notification> createdFrom(LocalDateTime from) {
        return (root, query, cb) -> from == null ? cb.conjunction()
                : cb.greaterThanOrEqualTo(root.get("createdAt"), from);
    }

    public static Specification<Notification> createdTo(LocalDateTime to) {
        return (root, query, cb) -> to == null ? cb.conjunction() : cb.lessThanOrEqualTo(root.get("createdAt"), to);
    }

    public static Specification<Notification> byType(String type) {
        return (root, query, cb) -> (type == null || type.isBlank())
                ? cb.conjunction()
                : cb.equal(root.get("type"), Notification.Type.valueOf(type));
    }
}
