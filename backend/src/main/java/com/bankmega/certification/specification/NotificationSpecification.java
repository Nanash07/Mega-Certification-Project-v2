package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.Notification;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import java.time.LocalDateTime;
import java.util.Set;

public class NotificationSpecification {

    public static Specification<Notification> byUser(Long userId) {
        return (root, query, cb) -> userId == null ? cb.conjunction() : cb.equal(root.get("userId"), userId);
    }

    public static Specification<Notification> unreadOnly(Boolean unread) {
        return (root, query, cb) -> {
            if (unread == null) {
                return cb.conjunction(); // semua
            }
            return unread
                    ? cb.isFalse(root.get("isRead")) // BELUM dibaca
                    : cb.isTrue(root.get("isRead")); // SUDAH dibaca
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

    public static Specification<Notification> visibleToPic(Set<Long> certificationIds) {
        return (root, query, cb) -> {
            if (certificationIds == null || certificationIds.isEmpty()) {
                return cb.disjunction();
            }
            if (query == null) {
                return cb.conjunction();
            }

            Subquery<Long> ecSub = query.subquery(Long.class);
            Root<EmployeeCertification> ec = ecSub.from(EmployeeCertification.class);
            Join<Object, Object> ecRule = ec.join("certificationRule");
            Join<Object, Object> ecCert = ecRule.join("certification");
            ecSub.select(ec.get("id")).where(ecCert.get("id").in(certificationIds));

            Subquery<Long> bSub = query.subquery(Long.class);
            Root<Batch> b = bSub.from(Batch.class);
            Join<Object, Object> bRule = b.join("certificationRule");
            Join<Object, Object> bCert = bRule.join("certification");
            bSub.select(b.get("id")).where(bCert.get("id").in(certificationIds));

            var pEc = cb.and(
                    cb.equal(root.get("relatedEntity"), "EmployeeCertification"),
                    root.get("relatedEntityId").in(ecSub));

            var pBatch = cb.and(
                    cb.equal(root.get("relatedEntity"), "Batch"),
                    root.get("relatedEntityId").in(bSub));

            return cb.or(pEc, pBatch);
        };
    }
}
