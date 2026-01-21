package com.bankmega.certification.specification;

import com.bankmega.certification.entity.CertificationRuleHistory;
import org.springframework.data.jpa.domain.Specification;

public class CertificationRuleHistorySpecification {

    public static Specification<CertificationRuleHistory> byRuleId(Long ruleId) {
        return (root, query, cb) -> {
            if (ruleId == null) {
                return cb.conjunction(); // ga filter kalau null
            }
            return cb.equal(root.get("certificationRule").get("id"), ruleId);
        };
    }

    public static Specification<CertificationRuleHistory> byActionType(String actionType) {
        return (root, query, cb) -> {
            if (actionType == null || actionType.equalsIgnoreCase("all")) {
                return cb.conjunction();
            }
            try {
                CertificationRuleHistory.ActionType enumVal = CertificationRuleHistory.ActionType
                        .valueOf(actionType.toUpperCase());
                return cb.equal(root.get("actionType"), enumVal);
            } catch (IllegalArgumentException e) {
                // kalau actionType gak valid, balikin no-result
                return cb.disjunction();
            }
        };
    }

    public static Specification<CertificationRuleHistory> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + keyword.toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("certificationName")), like),
                    cb.like(cb.lower(root.get("certificationCode")), like),
                    cb.like(cb.lower(root.get("certificationLevelName")), like),
                    cb.like(cb.lower(root.get("subFieldName")), like),
                    cb.like(cb.lower(root.get("subFieldCode")), like),

                    cb.like(cb.lower(cb.function("CAST", String.class, root.get("certificationLevelLevel"))), like));
        };
    }
}
