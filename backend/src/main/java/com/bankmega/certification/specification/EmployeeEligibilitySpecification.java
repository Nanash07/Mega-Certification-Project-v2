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
                empFetch.fetch("jobPosition", JoinType.LEFT);
                empFetch.fetch("regional", JoinType.LEFT);
                empFetch.fetch("division", JoinType.LEFT);
                empFetch.fetch("unit", JoinType.LEFT);

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
        return (root, query, cb) -> (jobIds == null || jobIds.isEmpty())
                ? cb.conjunction()
                : root.get("employee").get("jobPosition").get("id").in(jobIds);
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

    public static Specification<EmployeeEligibility> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + keyword.toLowerCase() + "%";

            var likeNip = cb.like(cb.lower(root.get("employee").get("nip")), likePattern);
            var likeEmpName = cb.like(cb.lower(root.get("employee").get("name")), likePattern);
            var likeJobName = cb.like(cb.lower(root.get("employee").get("jobPosition").get("name")), likePattern);
            var likeCertCode = cb.like(cb.lower(root.get("certificationRule").get("certification").get("code")),
                    likePattern);
            var likeCertName = cb.like(cb.lower(root.get("certificationRule").get("certification").get("name")),
                    likePattern);
            var likeSubName = cb.like(cb.lower(root.get("certificationRule").get("subField").get("name")), likePattern);

            var likeSource = cb.like(
                    cb.lower(cb.function("str", String.class, root.get("source"))),
                    likePattern);

            return cb.or(likeNip, likeEmpName, likeJobName,
                    likeCertCode, likeCertName, likeSubName,
                    likeSource);
        };
    }

    // ===== Filter tambahan buat "dashboard style" =====

    public static Specification<EmployeeEligibility> byRegionalId(Long regionalId) {
        return (root, query, cb) -> (regionalId == null)
                ? cb.conjunction()
                : cb.equal(root.get("employee").get("regional").get("id"), regionalId);
    }

    public static Specification<EmployeeEligibility> byDivisionId(Long divisionId) {
        return (root, query, cb) -> (divisionId == null)
                ? cb.conjunction()
                : cb.equal(root.get("employee").get("division").get("id"), divisionId);
    }

    public static Specification<EmployeeEligibility> byUnitId(Long unitId) {
        return (root, query, cb) -> (unitId == null)
                ? cb.conjunction()
                : cb.equal(root.get("employee").get("unit").get("id"), unitId);
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
