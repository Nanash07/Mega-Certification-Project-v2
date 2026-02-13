// src/main/java/com/bankmega/certification/specification/EmployeeSpecification.java
package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Employee;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class EmployeeSpecification {

    // ===== Base filters =====

    public static Specification<Employee> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<Employee> deleted() {
        return (root, query, cb) -> cb.isNotNull(root.get("deletedAt"));
    }

    // ===== Status filters =====

    public static Specification<Employee> statusIs(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank())
                return cb.conjunction();
            return cb.equal(cb.upper(root.get("status")), status.toUpperCase());
        };
    }

    public static Specification<Employee> statusNot(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank())
                return cb.conjunction();
            return cb.notEqual(cb.upper(root.get("status")), status.toUpperCase());
        };
    }

    public static Specification<Employee> byStatuses(List<String> statuses) {
        return (root, query, cb) -> {
            if (statuses == null || statuses.isEmpty())
                return cb.conjunction();
            var upperStatuses = statuses.stream().map(String::toUpperCase).toList();
            return cb.upper(root.get("status")).in(upperStatuses);
        };
    }

    public static Specification<Employee> activePageOnly() {
        return notDeleted().and(statusNot("RESIGN"));
    }

    public static Specification<Employee> resignedPageOnly() {
        return notDeleted().and(statusIs("RESIGN"));
    }

    // ===== Search + multi filters =====

    public static Specification<Employee> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + search.toLowerCase() + "%";

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            // Optimasi: Split search di Java, jangan CONCAT di DB
            jakarta.persistence.criteria.Predicate splitMatch = cb.disjunction();
            if (search.contains(" - ")) {
                String[] parts = search.split(" - ", 2);
                if (parts.length == 2) {
                    splitMatch = cb.and(
                            cb.like(cb.lower(root.get("nip")), "%" + parts[0].trim().toLowerCase() + "%"),
                            cb.like(cb.lower(root.get("name")), "%" + parts[1].trim().toLowerCase() + "%"));
                }
            }

            return cb.or(
                    cb.like(cb.lower(root.get("nip")), like),
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    splitMatch,
                    cb.and(
                            cb.isNull(positions.get("deletedAt")),
                            cb.isTrue(positions.get("isActive")),
                            cb.like(cb.lower(positions.get("jobPosition").get("name")), like)));
        };
    }

    public static Specification<Employee> byEmployeeIds(List<Long> employeeIds) {
        return (root, query, cb) -> (employeeIds == null || employeeIds.isEmpty())
                ? cb.conjunction()
                : root.get("id").in(employeeIds);
    }

    public static Specification<Employee> byRegionalIds(List<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty())
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("regional").get("id").in(ids));
        };
    }

    public static Specification<Employee> byDivisionIds(List<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty())
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("division").get("id").in(ids));
        };
    }

    public static Specification<Employee> byUnitIds(List<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty())
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("unit").get("id").in(ids));
        };
    }

    public static Specification<Employee> byJobPositionIds(List<Long> ids) {
        return (root, query, cb) -> {
            if (ids == null || ids.isEmpty())
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("jobPosition").get("id").in(ids));
        };
    }

    // ===== Single-id filter (buat dashboard count) =====

    public static Specification<Employee> byRegionalId(Long id) {
        return (root, query, cb) -> {
            if (id == null)
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("regional").get("id"), id));
        };
    }

    public static Specification<Employee> byDivisionId(Long id) {
        return (root, query, cb) -> {
            if (id == null)
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("division").get("id"), id));
        };
    }

    public static Specification<Employee> byUnitId(Long id) {
        return (root, query, cb) -> {
            if (id == null)
                return cb.conjunction();

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("unit").get("id"), id));
        };
    }

    public static Specification<Employee> byPositionType(String positionType) {
        return (root, query, cb) -> {
            if (positionType == null || positionType.isBlank() || "ALL".equalsIgnoreCase(positionType)) {
                return cb.conjunction();
            }

            var positions = root.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            // Map string UTAMA/KEDUA to ENUM PRIMARY/SECONDARY
            com.bankmega.certification.entity.EmployeePosition.PositionType typeEnum;
            if ("UTAMA".equalsIgnoreCase(positionType) || "PRIMARY".equalsIgnoreCase(positionType)) {
                typeEnum = com.bankmega.certification.entity.EmployeePosition.PositionType.PRIMARY;
            } else if ("KEDUA".equalsIgnoreCase(positionType) || "SECONDARY".equalsIgnoreCase(positionType)) {
                typeEnum = com.bankmega.certification.entity.EmployeePosition.PositionType.SECONDARY;
            } else {
                // Return empty if invalid type
                return cb.disjunction();
            }

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("positionType"), typeEnum));
        };
    }
}
