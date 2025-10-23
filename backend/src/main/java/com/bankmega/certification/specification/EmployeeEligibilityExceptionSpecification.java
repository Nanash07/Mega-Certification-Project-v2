package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeEligibilityException;
import org.springframework.data.jpa.domain.Specification;

import jakarta.persistence.criteria.JoinType;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class EmployeeEligibilityExceptionSpecification {

    /** Hanya record yang belum soft-delete. */
    public static Specification<EmployeeEligibilityException> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    /** (Opsional) Hanya pegawai aktif: deletedAt IS NULL dan status != 'RESIGN'. */
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

    /** Filter by employee ids. */
    public static Specification<EmployeeEligibilityException> byEmployeeIds(List<Long> employeeIds) {
        return (root, query, cb) -> (employeeIds == null || employeeIds.isEmpty())
                ? cb.conjunction()
                : root.get("employee").get("id").in(employeeIds);
    }

    /** Filter by job ids (employee.jobPosition.id). */
    public static Specification<EmployeeEligibilityException> byJobIds(List<Long> jobIds) {
        return (root, query, cb) -> (jobIds == null || jobIds.isEmpty())
                ? cb.conjunction()
                : root.get("employee").get("jobPosition").get("id").in(jobIds);
    }

    /** Case-insensitive: certification.code IN (codes). */
    public static Specification<EmployeeEligibilityException> byCertCodes(List<String> certCodes) {
        return (root, query, cb) -> {
            List<String> vals = toLowerList(certCodes);
            if (vals.isEmpty())
                return cb.conjunction();
            return cb.lower(root.get("certificationRule").get("certification").get("code")).in(vals);
        };
    }

    /** certificationLevel.level IN (levels). */
    public static Specification<EmployeeEligibilityException> byLevels(List<Integer> levels) {
        return (root, query, cb) -> (levels == null || levels.isEmpty())
                ? cb.conjunction()
                : root.get("certificationRule").get("certificationLevel").get("level").in(levels);
    }

    /** Case-insensitive: subField.code IN (subCodes). */
    public static Specification<EmployeeEligibilityException> bySubCodes(List<String> subCodes) {
        return (root, query, cb) -> {
            List<String> vals = toLowerList(subCodes);
            if (vals.isEmpty())
                return cb.conjunction();
            return cb.lower(root.get("certificationRule").get("subField").get("code")).in(vals);
        };
    }

    /**
     * Status aktif/nonaktif:
     * - "ACTIVE"/"AKTIF"/"TRUE"/"Y"/"1" => isActive = true
     * - "INACTIVE"/"NONAKTIF"/"FALSE"/"N"/"0" => isActive = false
     */
    public static Specification<EmployeeEligibilityException> byStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.isBlank())
                return cb.conjunction();
            String s = status.trim().toLowerCase(Locale.ROOT);
            Boolean active = switch (s) {
                case "active", "aktif", "true", "y", "1" -> true;
                case "inactive", "nonaktif", "false", "n", "0" -> false;
                default -> null;
            };
            return (active == null) ? cb.conjunction() : cb.equal(root.get("isActive"), active);
        };
    }

    /** Full-text ringan (case-insensitive) ke beberapa kolom. */
    public static Specification<EmployeeEligibilityException> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty())
                return cb.conjunction();
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";

            var empNip = cb.like(cb.lower(root.get("employee").get("nip")), like);
            var empName = cb.like(cb.lower(root.get("employee").get("name")), like);
            var jobName = cb.like(cb.lower(root.get("employee").get("jobPosition").get("name")), like);
            var certCode = cb.like(cb.lower(root.get("certificationRule").get("certification").get("code")), like);
            var certName = cb.like(cb.lower(root.get("certificationRule").get("certification").get("name")), like);
            var subName = cb.like(cb.lower(root.get("certificationRule").get("subField").get("name")), like);
            var notes = cb.like(cb.lower(root.get("notes").as(String.class)), like);

            return cb.or(empNip, empName, jobName, certCode, certName, subName, notes);
        };
    }

    // ------------ utils ------------
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
