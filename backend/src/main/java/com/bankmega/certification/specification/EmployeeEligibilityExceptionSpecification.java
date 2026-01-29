package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeEligibilityException;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.JoinType;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class EmployeeEligibilityExceptionSpecification {

    public static Specification<EmployeeEligibilityException> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<EmployeeEligibilityException> onlyActiveEmployees() {
        return (root, query, cb) -> {
            var emp = root.join("employee", JoinType.INNER);
            return cb.and(
                    cb.isNull(emp.get("deletedAt")),
                    cb.or(
                            cb.isNull(emp.get("status")),
                            cb.notEqual(cb.lower(emp.get("status")), cb.literal("resign"))));
        };
    }

    public static Specification<EmployeeEligibilityException> byEmployeeIds(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return null;
        return (root, query, cb) -> root.get("employee").get("id").in(employeeIds);
    }

    public static Specification<EmployeeEligibilityException> byJobIds(List<Long> jobIds) {
        return (root, query, cb) -> {
            if (jobIds == null || jobIds.isEmpty())
                return cb.conjunction();

            // Match pattern from EmployeeEligibilitySpecification
            var emp = root.join("employee", JoinType.LEFT);
            var positions = emp.join("positions", JoinType.LEFT);

            return cb.and(
                    cb.isNull(positions.get("deletedAt")),
                    cb.isTrue(positions.get("isActive")),
                    positions.get("jobPosition").get("id").in(jobIds));
        };
    }

    public static Specification<EmployeeEligibilityException> byCertCodes(List<String> certCodes) {
        List<String> vals = toLowerList(certCodes);
        if (vals.isEmpty())
            return null;
        return (root, query, cb) -> cb.lower(root.get("certificationRule").get("certification").get("code")).in(vals);
    }

    public static Specification<EmployeeEligibilityException> byLevels(List<Integer> levels) {
        if (levels == null || levels.isEmpty())
            return null;
        return (root, query, cb) -> root.get("certificationRule").get("certificationLevel").get("level").in(levels);
    }

    public static Specification<EmployeeEligibilityException> bySubCodes(List<String> subCodes) {
        List<String> vals = toLowerList(subCodes);
        if (vals.isEmpty())
            return null;
        return (root, query, cb) -> cb.lower(root.get("certificationRule").get("subField").get("code")).in(vals);
    }

    public static Specification<EmployeeEligibilityException> byStatus(String status) {
        Boolean active = parseActive(status);
        if (active == null)
            return null;
        return (root, query, cb) -> cb.equal(root.get("isActive"), active);
    }

    public static Specification<EmployeeEligibilityException> byStatuses(List<String> statuses) {
        if (statuses == null || statuses.isEmpty())
            return null;

        Boolean hasTrue = null;
        Boolean hasFalse = null;

        for (String s : statuses) {
            Boolean v = parseActive(s);
            if (v == null)
                continue;
            if (Boolean.TRUE.equals(v))
                hasTrue = true;
            if (Boolean.FALSE.equals(v))
                hasFalse = true;
        }

        if (Boolean.TRUE.equals(hasTrue) && Boolean.TRUE.equals(hasFalse))
            return null;
        if (Boolean.TRUE.equals(hasTrue))
            return (root, query, cb) -> cb.isTrue(root.get("isActive"));
        if (Boolean.TRUE.equals(hasFalse))
            return (root, query, cb) -> cb.isFalse(root.get("isActive"));

        return null;
    }

    public static Specification<EmployeeEligibilityException> byAllowedCertificationIds(List<Long> allowedCertIds) {
        if (allowedCertIds == null)
            return null;
        if (allowedCertIds.isEmpty()) {
            return (root, query, cb) -> cb.disjunction();
        }

        return (root, query, cb) -> {
            var rule = root.join("certificationRule", JoinType.INNER);
            var cert = rule.join("certification", JoinType.INNER);
            return cert.get("id").in(allowedCertIds);
        };
    }

    public static Specification<EmployeeEligibilityException> bySearch(String keyword) {
        if (keyword == null || keyword.trim().isEmpty())
            return null;

        return (root, query, cb) -> {
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";

            var emp = root.join("employee", JoinType.LEFT);

            var rule = root.join("certificationRule", JoinType.LEFT);
            var cert = rule.join("certification", JoinType.LEFT);
            var level = rule.join("certificationLevel", JoinType.LEFT);
            var sub = rule.join("subField", JoinType.LEFT);

            // Basic searches without positions join to avoid complexity
            var empNip = cb.like(cb.coalesce(cb.lower(emp.get("nip")), ""), like);
            var empName = cb.like(cb.coalesce(cb.lower(emp.get("name")), ""), like);

            var certCode = cb.like(cb.coalesce(cb.lower(cert.get("code")), ""), like);
            var certName = cb.like(cb.coalesce(cb.lower(cert.get("name")), ""), like);

            var levelName = cb.like(cb.coalesce(cb.lower(level.get("name")), ""), like);
            var subCode = cb.like(cb.coalesce(cb.lower(sub.get("code")), ""), like);
            var subName = cb.like(cb.coalesce(cb.lower(sub.get("name")), ""), like);

            var notes = cb.like(cb.coalesce(cb.lower(root.get("notes")), ""), like);

            return cb.or(empNip, empName, certCode, certName, levelName, subCode, subName, notes);
        };
    }

    private static Boolean parseActive(String status) {
        if (status == null || status.isBlank())
            return null;
        String s = status.trim().toLowerCase(Locale.ROOT);

        return switch (s) {
            case "active", "aktif", "true", "y", "yes", "1" -> true;
            case "inactive", "nonactive", "nonaktif", "false", "n", "no", "0" -> false;
            default -> null;
        };
    }

    private static List<String> toLowerList(List<String> src) {
        if (src == null || src.isEmpty())
            return List.of();
        List<String> out = new ArrayList<>(src.size());
        for (String s : src) {
            if (s == null)
                continue;
            String t = s.trim();
            if (!t.isEmpty())
                out.add(t.toLowerCase(Locale.ROOT));
        }
        return out;
    }
}
