package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeBatch;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public class EmployeeBatchSpecification {

    // 🔹 Soft delete filter
    public static Specification<EmployeeBatch> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    // 🔹 Filter by batchId
    public static Specification<EmployeeBatch> byBatch(Long batchId) {
        return (root, query, cb) -> batchId == null ? cb.conjunction() : cb.equal(root.get("batch").get("id"), batchId);
    }

    // 🔹 Filter by status
    public static Specification<EmployeeBatch> byStatus(EmployeeBatch.Status status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    // 🔹 Filter by employee (nama/nip contains)
    public static Specification<EmployeeBatch> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty())
                return cb.conjunction();
            String like = "%" + search.toLowerCase() + "%";

            var emp = root.join("employee", JoinType.LEFT);

            // Optimasi split
            jakarta.persistence.criteria.Predicate splitMatch = cb.disjunction();
            if (search.contains(" - ")) {
                String[] parts = search.split(" - ", 2);
                if (parts.length == 2) {
                    splitMatch = cb.and(
                            cb.like(cb.lower(emp.get("nip")), "%" + parts[0].trim().toLowerCase() + "%"),
                            cb.like(cb.lower(emp.get("name")), "%" + parts[1].trim().toLowerCase() + "%"));
                }
            }

            return cb.or(
                    cb.like(cb.lower(emp.get("name")), like),
                    cb.like(cb.lower(emp.get("nip")), like),
                    splitMatch);
        };
    }

    // Filter by regional/division/unit/job via positions (case-insensitive name
    // match)
    public static Specification<EmployeeBatch> byRegionalName(String regional) {
        return (root, query, cb) -> {
            if (regional == null || regional.isBlank())
                return cb.conjunction();
            Join<Object, Object> emp = root.join("employee", JoinType.LEFT);
            Join<Object, Object> positions = emp.join("positions", JoinType.LEFT);
            return cb.and(
                    cb.equal(positions.get("isActive"), true),
                    cb.equal(cb.lower(positions.get("regional").get("name")), regional.toLowerCase()));
        };
    }

    public static Specification<EmployeeBatch> byDivisionName(String division) {
        return (root, query, cb) -> {
            if (division == null || division.isBlank())
                return cb.conjunction();
            Join<Object, Object> emp = root.join("employee", JoinType.LEFT);
            Join<Object, Object> positions = emp.join("positions", JoinType.LEFT);
            return cb.and(
                    cb.equal(positions.get("isActive"), true),
                    cb.equal(cb.lower(positions.get("division").get("name")), division.toLowerCase()));
        };
    }

    public static Specification<EmployeeBatch> byUnitName(String unit) {
        return (root, query, cb) -> {
            if (unit == null || unit.isBlank())
                return cb.conjunction();
            Join<Object, Object> emp = root.join("employee", JoinType.LEFT);
            Join<Object, Object> positions = emp.join("positions", JoinType.LEFT);
            return cb.and(
                    cb.equal(positions.get("isActive"), true),
                    cb.equal(cb.lower(positions.get("unit").get("name")), unit.toLowerCase()));
        };
    }

    public static Specification<EmployeeBatch> byJobName(String job) {
        return (root, query, cb) -> {
            if (job == null || job.isBlank())
                return cb.conjunction();
            Join<Object, Object> emp = root.join("employee", JoinType.LEFT);
            Join<Object, Object> positions = emp.join("positions", JoinType.LEFT);
            return cb.and(
                    cb.equal(positions.get("isActive"), true),
                    cb.equal(cb.lower(positions.get("jobPosition").get("name")), job.toLowerCase()));
        };
    }

    // Note: withOrgFetch() removed - eager fetching now handled by @EntityGraph in
    // EmployeeBatchRepository
}
