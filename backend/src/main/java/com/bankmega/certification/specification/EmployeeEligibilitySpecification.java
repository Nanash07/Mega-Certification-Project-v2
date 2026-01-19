// src/main/java/com/bankmega/certification/specification/EmployeeEligibilitySpecification.java
package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeEligibility;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.stream.Collectors;

public class EmployeeEligibilitySpecification {

    public static Specification<EmployeeEligibility> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<EmployeeEligibility> withFetchJoins() {
        return (root, query, cb) -> {
            if (query != null && query.getResultType() != Long.class && query.getResultType() != long.class) {
                var empFetch = root.fetch("employee", JoinType.LEFT);
                // Fetch positions and their details
                var posFetch = empFetch.fetch("positions", JoinType.LEFT);
                posFetch.fetch("jobPosition", JoinType.LEFT);
                posFetch.fetch("regional", JoinType.LEFT);
                posFetch.fetch("division", JoinType.LEFT);
                posFetch.fetch("unit", JoinType.LEFT);

                var ruleFetch = root.fetch("certificationRule", JoinType.LEFT);
                ruleFetch.fetch("certification", JoinType.LEFT);
                ruleFetch.fetch("certificationLevel", JoinType.LEFT);
                ruleFetch.fetch("subField", JoinType.LEFT);
            }
            return cb.conjunction();
        };
    }

    public static Specification<EmployeeEligibility> byEmployeeIds(List<Long> employeeIds) {
        return (root, query, cb) -> (employeeIds == null || employeeIds.isEmpty())
                ? cb.conjunction()
                : root.get("employee").get("id").in(employeeIds);
    }

    public static Specification<EmployeeEligibility> byJobIds(List<Long> jobIds) {
        return (root, query, cb) -> {
            if (jobIds == null || jobIds.isEmpty())
                return cb.conjunction();

            // Re-join for filtering if not already joined in query structure (usually safe
            // to join again)
            // But relying on positions join is better
            var emp = root.join("employee", JoinType.LEFT);
            var positions = emp.join("positions", JoinType.LEFT);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("jobPosition").get("id").in(jobIds));
        };
    }

    public static Specification<EmployeeEligibility> byCertCodes(List<String> certCodes) {
        return (root, query, cb) -> (certCodes == null || certCodes.isEmpty())
                ? cb.conjunction()
                : root.get("certificationRule").get("certification").get("code").in(certCodes);
    }

    public static Specification<EmployeeEligibility> byLevels(List<Integer> levels) {
        return (root, query, cb) -> (levels == null || levels.isEmpty())
                ? cb.conjunction()
                : root.get("certificationRule").get("certificationLevel").get("level").in(levels);
    }

    public static Specification<EmployeeEligibility> bySubCodes(List<String> subCodes) {
        return (root, query, cb) -> (subCodes == null || subCodes.isEmpty())
                ? cb.conjunction()
                : root.get("certificationRule").get("subField").get("code").in(subCodes);
    }

    public static Specification<EmployeeEligibility> byStatuses(List<String> statuses) {
        return (root, query, cb) -> {
            if (statuses == null || statuses.isEmpty())
                return cb.conjunction();
            List<EmployeeEligibility.EligibilityStatus> parsed = statuses.stream()
                    .map(String::toUpperCase)
                    .map(EmployeeEligibility.EligibilityStatus::valueOf)
                    .collect(Collectors.toList());
            return root.get("status").in(parsed);
        };
    }

    public static Specification<EmployeeEligibility> bySources(List<String> sources) {
        return (root, query, cb) -> {
            if (sources == null || sources.isEmpty())
                return cb.conjunction();
            List<EmployeeEligibility.EligibilitySource> parsed = sources.stream()
                    .map(String::toUpperCase)
                    .map(EmployeeEligibility.EligibilitySource::valueOf)
                    .collect(Collectors.toList());
            return root.get("source").in(parsed);
        };
    }

    public static Specification<EmployeeEligibility> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty())
                return cb.conjunction();

            String like = "%" + search.toLowerCase() + "%";
            var employee = root.join("employee", JoinType.LEFT);
            var positions = employee.join("positions", JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.or(
                    cb.like(cb.lower(employee.get("nip")), like),
                    cb.like(cb.lower(employee.get("name")), like),
                    cb.and(
                            cb.isNull(positions.get("deletedAt")),
                            cb.isTrue(positions.get("isActive")),
                            cb.like(cb.lower(positions.get("jobPosition").get("name")), like)),
                    cb.like(cb.lower(root.get("certificationRule").get("certification").get("code")), like),
                    cb.like(cb.lower(root.get("certificationRule").get("certification").get("name")), like),
                    cb.like(cb.lower(root.get("certificationRule").get("subField").get("name")), like),
                    cb.like(cb.lower(cb.function("str", String.class, root.get("source"))), like));
        };
    }

    // ===== Filter tambahan buat "dashboard style" =====

    public static Specification<EmployeeEligibility> byRegionalId(Long regionalId) {
        return (root, query, cb) -> {
            if (regionalId == null)
                return cb.conjunction();

            var employee = root.join("employee");
            var positions = employee.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("regional").get("id"), regionalId));
        };
    }

    public static Specification<EmployeeEligibility> byDivisionId(Long divisionId) {
        return (root, query, cb) -> {
            if (divisionId == null)
                return cb.conjunction();

            var employee = root.join("employee");
            var positions = employee.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("division").get("id"), divisionId));
        };
    }

    public static Specification<EmployeeEligibility> byUnitId(Long unitId) {
        return (root, query, cb) -> {
            if (unitId == null)
                return cb.conjunction();

            var employee = root.join("employee");
            var positions = employee.join("positions", jakarta.persistence.criteria.JoinType.LEFT);
            if (query != null)
                query.distinct(true);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    cb.equal(positions.get("unit").get("id"), unitId));
        };
    }

    public static Specification<EmployeeEligibility> byCertificationId(Long certificationId) {
        return (root, query, cb) -> (certificationId == null)
                ? cb.conjunction()
                : cb.equal(root.get("certificationRule").get("certification").get("id"), certificationId);
    }

    public static Specification<EmployeeEligibility> byLevelId(Long levelId) {
        return (root, query, cb) -> (levelId == null)
                ? cb.conjunction()
                : cb.equal(root.get("certificationRule").get("certificationLevel").get("id"), levelId);
    }

    public static Specification<EmployeeEligibility> bySubFieldId(Long subFieldId) {
        return (root, query, cb) -> (subFieldId == null)
                ? cb.conjunction()
                : cb.equal(root.get("certificationRule").get("subField").get("id"), subFieldId);
    }

    /**
     * PIC scope: list id sertifikasi yang diizinkan.
     * null = full access, empty = 0 rows (disjunction).
     */
    public static Specification<EmployeeEligibility> byAllowedCertificationIds(List<Long> allowedCertIds) {
        return (root, query, cb) -> {
            if (allowedCertIds == null) {
                return cb.conjunction();
            }
            if (allowedCertIds.isEmpty()) {
                return cb.disjunction(); // selalu false -> 0 row
            }
            return root.get("certificationRule").get("certification").get("id").in(allowedCertIds);
        };
    }
}
