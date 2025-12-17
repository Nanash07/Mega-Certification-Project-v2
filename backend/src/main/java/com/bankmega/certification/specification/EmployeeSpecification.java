// src/main/java/com/bankmega/certification/specification/EmployeeSpecification.java
package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Employee;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class EmployeeSpecification {

    // ===== Base filters =====

    /** Data yang "masih ada di sistem" (belum dihapus/soft delete) */
    public static Specification<Employee> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    /** Data yang sudah dihapus/soft delete dari sistem */
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

    /** Active page: belum dihapus dari sistem DAN bukan resign */
    public static Specification<Employee> activePageOnly() {
        return Specification.where(notDeleted()).and(statusNot("RESIGN"));
    }

    /** Resigned page: belum dihapus dari sistem DAN status resign */
    public static Specification<Employee> resignedPageOnly() {
        return Specification.where(notDeleted()).and(statusIs("RESIGN"));
    }

    // ===== Search + multi filters =====

    public static Specification<Employee> bySearch(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + search.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("nip")), like),
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("jobPosition").get("name")), like));
        };
    }

    public static Specification<Employee> byEmployeeIds(List<Long> employeeIds) {
        return (root, query, cb) -> (employeeIds == null || employeeIds.isEmpty())
                ? cb.conjunction()
                : root.get("id").in(employeeIds);
    }

    public static Specification<Employee> byRegionalIds(List<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty())
                ? cb.conjunction()
                : root.get("regional").get("id").in(ids);
    }

    public static Specification<Employee> byDivisionIds(List<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty())
                ? cb.conjunction()
                : root.get("division").get("id").in(ids);
    }

    public static Specification<Employee> byUnitIds(List<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty())
                ? cb.conjunction()
                : root.get("unit").get("id").in(ids);
    }

    public static Specification<Employee> byJobPositionIds(List<Long> ids) {
        return (root, query, cb) -> (ids == null || ids.isEmpty())
                ? cb.conjunction()
                : root.get("jobPosition").get("id").in(ids);
    }

    // ===== Single-id filter (buat dashboard count) =====

    public static Specification<Employee> byRegionalId(Long id) {
        return (root, query, cb) -> (id == null)
                ? cb.conjunction()
                : cb.equal(root.get("regional").get("id"), id);
    }

    public static Specification<Employee> byDivisionId(Long id) {
        return (root, query, cb) -> (id == null)
                ? cb.conjunction()
                : cb.equal(root.get("division").get("id"), id);
    }

    public static Specification<Employee> byUnitId(Long id) {
        return (root, query, cb) -> (id == null)
                ? cb.conjunction()
                : cb.equal(root.get("unit").get("id"), id);
    }
}
