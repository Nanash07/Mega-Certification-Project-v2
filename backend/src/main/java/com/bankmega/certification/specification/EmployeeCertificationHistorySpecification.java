package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeCertificationHistory;
import org.springframework.data.jpa.domain.Specification;

public class EmployeeCertificationHistorySpecification {

    public static Specification<EmployeeCertificationHistory> byCertificationId(Long certificationId) {
        return (root, query, cb) -> {
            if (certificationId == null) {
                return cb.conjunction(); // ga filter kalau null
            }
            return cb.equal(root.get("employeeCertification").get("id"), certificationId);
        };
    }

    public static Specification<EmployeeCertificationHistory> byActionType(String actionType) {
        return (root, query, cb) -> {
            if (actionType == null || actionType.equalsIgnoreCase("all")) {
                return cb.conjunction();
            }
            try {
                EmployeeCertificationHistory.ActionType enumVal = EmployeeCertificationHistory.ActionType
                        .valueOf(actionType.toUpperCase());
                return cb.equal(root.get("actionType"), enumVal);
            } catch (IllegalArgumentException e) {
                return cb.disjunction(); // kalau value ga valid → hasil kosong
            }
        };
    }

    public static Specification<EmployeeCertificationHistory> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("employeeName")), like),
                    cb.like(cb.lower(root.get("employeeNip")), like),
                    cb.like(cb.lower(root.get("certificationName")), like),
                    cb.like(cb.lower(root.get("certificationCode")), like),
                    cb.like(cb.lower(root.get("subFieldCode")), like),
                    cb.like(cb.lower(root.get("subFieldName")), like),
                    cb.like(cb.lower(root.get("certNumber")), like),
                    cb.like(cb.lower(root.get("status").as(String.class)), like),
                    cb.like(cb.lower(root.get("institutionName")), like));
        };
    }
}
