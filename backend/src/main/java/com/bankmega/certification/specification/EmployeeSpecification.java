package com.bankmega.certification.specification;

import com.bankmega.certification.entity.Employee;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class EmployeeSpecification {

    public static Specification<Employee> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<Employee> deleted() {
        return (root, query, cb) -> cb.isNotNull(root.get("deletedAt"));
    }

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
}
