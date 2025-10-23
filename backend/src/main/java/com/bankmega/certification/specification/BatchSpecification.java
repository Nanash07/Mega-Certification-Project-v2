// src/main/java/com/bankmega/certification/specification/BatchSpecification.java

package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Batch;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class BatchSpecification {

    // 🔹 Filter: belum dihapus (soft delete)
    public static Specification<Batch> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    // 🔹 Filter: search (by batchName)
    public static Specification<Batch> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + search.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("batchName")), like);
        };
    }

    // 🔹 Filter: by status
    public static Specification<Batch> byStatus(Batch.Status status) {
        return (root, query, cb) -> status == null
                ? cb.conjunction()
                : cb.equal(root.get("status"), status);
    }

    // 🔹 Filter: by certificationRuleId
    public static Specification<Batch> byCertificationRule(Long certificationRuleId) {
        return (root, query, cb) -> certificationRuleId == null
                ? cb.conjunction()
                : cb.equal(root.get("certificationRule").get("id"), certificationRuleId);
    }

    // 🔹 Filter: by institutionId
    public static Specification<Batch> byInstitution(Long institutionId) {
        return (root, query, cb) -> institutionId == null
                ? cb.conjunction()
                : cb.equal(root.get("institution").get("id"), institutionId);
    }

    public static Specification<Batch> byType(Batch.BatchType type) {
        return (root, query, cb) -> type == null ? cb.conjunction() : cb.equal(root.get("type"), type);
    }

    // 🔹 Filter: by date range (startDate / endDate)
    public static Specification<Batch> byDateRange(LocalDate start, LocalDate end) {
        return (root, query, cb) -> {
            if (start == null && end == null) {
                return cb.conjunction();
            } else if (start != null && end != null) {
                return cb.between(root.get("startDate"), start, end);
            } else if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("startDate"), start);
            } else {
                return cb.lessThanOrEqualTo(root.get("endDate"), end);
            }
        };
    }
}