// src/main/java/com/bankmega/certification/specification/BatchSpecification.java
package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Batch;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.time.LocalDate;
import java.util.List;

public class BatchSpecification {

    public static Specification<Batch> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<Batch> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + search.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("batchName")), like);
        };
    }

    public static Specification<Batch> byStatus(Batch.Status status) {
        return (root, query, cb) -> status == null
                ? cb.conjunction()
                : cb.equal(root.get("status"), status);
    }

    public static Specification<Batch> byType(Batch.BatchType type) {
        return (root, query, cb) -> type == null
                ? cb.conjunction()
                : cb.equal(root.get("type"), type);
    }

    public static Specification<Batch> byCertificationRule(Long certificationRuleId) {
        return (root, query, cb) -> certificationRuleId == null
                ? cb.conjunction()
                : cb.equal(root.get("certificationRule").get("id"), certificationRuleId);
    }

    public static Specification<Batch> byInstitution(Long institutionId) {
        return (root, query, cb) -> institutionId == null
                ? cb.conjunction()
                : cb.equal(root.get("institution").get("id"), institutionId);
    }

    // ===== filter tambahan utk dashboard =====

    public static Specification<Batch> byCertification(Long certificationId) {
        return (root, query, cb) -> {
            if (certificationId == null)
                return cb.conjunction();
            Join<Object, Object> rule = root.join("certificationRule", JoinType.LEFT);
            Join<Object, Object> cert = rule.join("certification", JoinType.LEFT);
            return cb.equal(cert.get("id"), certificationId);
        };
    }

    public static Specification<Batch> byCertificationLevel(Long levelId) {
        return (root, query, cb) -> {
            if (levelId == null)
                return cb.conjunction();
            Join<Object, Object> rule = root.join("certificationRule", JoinType.LEFT);
            Join<Object, Object> lvl = rule.join("certificationLevel", JoinType.LEFT);
            return cb.equal(lvl.get("id"), levelId);
        };
    }

    public static Specification<Batch> bySubField(Long subFieldId) {
        return (root, query, cb) -> {
            if (subFieldId == null)
                return cb.conjunction();
            Join<Object, Object> rule = root.join("certificationRule", JoinType.LEFT);
            Join<Object, Object> sf = rule.join("subField", JoinType.LEFT);
            return cb.equal(sf.get("id"), subFieldId);
        };
    }

    // PIC scope: allowed certification IDs (certification.id IN (...))
    public static Specification<Batch> byAllowedCertifications(List<Long> certIds) {
        return (root, query, cb) -> {
            if (certIds == null || certIds.isEmpty()) {
                return cb.conjunction();
            }
            Join<Object, Object> rule = root.join("certificationRule", JoinType.LEFT);
            Join<Object, Object> cert = rule.join("certification", JoinType.LEFT);
            return cert.get("id").in(certIds);
        };
    }

    // scope organisasi (regional/division/unit) via employee_batches -> employee
    public static Specification<Batch> byOrgScope(Long regionalId, Long divisionId, Long unitId) {
        return (root, query, cb) -> {
            if (regionalId == null && divisionId == null && unitId == null) {
                return cb.conjunction();
            }

            // asumsi: Batch has Set<EmployeeBatch> employeeBatches; EmployeeBatch has
            // employee; Employee has regional/division/unit rel
            Join<Object, Object> eb = root.join("employeeBatches", JoinType.LEFT);
            Join<Object, Object> e = eb.join("employee", JoinType.LEFT);

            // (e.id IS NULL OR (filters...))
            var predicates = cb.conjunction();

            if (regionalId != null) {
                predicates = cb.and(predicates, cb.equal(e.get("regional").get("id"), regionalId));
            }
            if (divisionId != null) {
                predicates = cb.and(predicates, cb.equal(e.get("division").get("id"), divisionId));
            }
            if (unitId != null) {
                predicates = cb.and(predicates, cb.equal(e.get("unit").get("id"), unitId));
            }

            return cb.or(cb.isNull(e.get("id")), predicates);
        };
    }

    // khusus employee: hanya batch yang diikuti employee tertentu
    public static Specification<Batch> byEmployee(Long employeeId) {
        return (root, query, cb) -> {
            if (employeeId == null)
                return cb.conjunction();
            Join<Object, Object> eb = root.join("employeeBatches", JoinType.INNER);
            Join<Object, Object> e = eb.join("employee", JoinType.INNER);
            return cb.equal(e.get("id"), employeeId);
        };
    }

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
