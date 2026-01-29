package com.bankmega.certification.specification;

import com.bankmega.certification.entity.CertificationRule;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class CertificationRuleSpecification {

    public static Specification<CertificationRule> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    public static Specification<CertificationRule> byCertIds(List<Long> certIds) {
        return (root, query, cb) -> (certIds == null || certIds.isEmpty())
                ? cb.conjunction()
                : root.get("certification").get("id").in(certIds);
    }

    public static Specification<CertificationRule> byLevelIds(List<Long> levelIds) {
        return (root, query, cb) -> (levelIds == null || levelIds.isEmpty())
                ? cb.conjunction()
                : root.get("certificationLevel").get("id").in(levelIds);
    }

    public static Specification<CertificationRule> bySubIds(List<Long> subIds) {
        return (root, query, cb) -> (subIds == null || subIds.isEmpty())
                ? cb.conjunction()
                : root.get("subField").get("id").in(subIds);
    }

    public static Specification<CertificationRule> byStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.equalsIgnoreCase("all")) {
                return cb.conjunction();
            }
            if (status.equalsIgnoreCase("active")) {
                return cb.isTrue(root.get("isActive"));
            }
            if (status.equalsIgnoreCase("inactive")) {
                return cb.isFalse(root.get("isActive"));
            }
            return cb.conjunction();
        };
    }

    public static Specification<CertificationRule> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String likePattern = "%" + keyword.toLowerCase() + "%";

            var cert = root.join("certification", jakarta.persistence.criteria.JoinType.LEFT);
            var sub = root.join("subField", jakarta.persistence.criteria.JoinType.LEFT);

            // Optimasi: Split di Java
            jakarta.persistence.criteria.Predicate splitMatch = cb.disjunction();
            if (keyword.contains(" - ")) {
                String[] parts = keyword.split(" - ", 2);
                if (parts.length == 2) {
                    splitMatch = cb.or(
                            // Match Certification Code - Name
                            cb.and(
                                    cb.like(cb.lower(cert.get("code")), "%" + parts[0].trim().toLowerCase() + "%"),
                                    cb.like(cb.lower(cert.get("name")), "%" + parts[1].trim().toLowerCase() + "%")),
                            // Match SubField Code - Name
                            cb.and(
                                    cb.like(cb.lower(sub.get("code")), "%" + parts[0].trim().toLowerCase() + "%"),
                                    cb.like(cb.lower(sub.get("name")), "%" + parts[1].trim().toLowerCase() + "%")));
                }
            }

            return cb.or(
                    cb.like(cb.lower(cert.get("name")), likePattern),
                    cb.like(cb.lower(cert.get("code")), likePattern),
                    cb.like(cb.lower(sub.get("name")), likePattern),
                    cb.like(cb.lower(sub.get("code")), likePattern),
                    splitMatch);
        };
    }
}