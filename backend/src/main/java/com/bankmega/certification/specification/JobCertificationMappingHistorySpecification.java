package com.bankmega.certification.specification;

import com.bankmega.certification.entity.JobCertificationMappingHistory;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.List;

public class JobCertificationMappingHistorySpecification {

    // 🔹 Filter berdasarkan Job Name
    public static Specification<JobCertificationMappingHistory> byJobName(String jobName) {
        return (root, query, cb) -> {
            if (jobName == null || jobName.isBlank()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get("jobName")), "%" + jobName.toLowerCase() + "%");
        };
    }

    // 🔹 Filter berdasarkan Certification Code
    public static Specification<JobCertificationMappingHistory> byCertCode(String certCode) {
        return (root, query, cb) -> {
            if (certCode == null || certCode.isBlank()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get("certificationCode")), "%" + certCode.toLowerCase() + "%");
        };
    }

    // 🔹 Filter berdasarkan Sub Field Code
    public static Specification<JobCertificationMappingHistory> bySubField(String subFieldCode) {
        return (root, query, cb) -> {
            if (subFieldCode == null || subFieldCode.isBlank()) {
                return cb.conjunction();
            }
            return cb.like(cb.lower(root.get("subFieldCode")), "%" + subFieldCode.toLowerCase() + "%");
        };
    }

    // 🔹 Filter berdasarkan Action Type (CREATED, UPDATED, TOGGLED, DELETED)
    public static Specification<JobCertificationMappingHistory> byActionType(String actionType) {
        return (root, query, cb) -> {
            if (actionType == null || actionType.equalsIgnoreCase("all")) {
                return cb.conjunction();
            }
            try {
                JobCertificationMappingHistory.ActionType enumVal = JobCertificationMappingHistory.ActionType
                        .valueOf(actionType.toUpperCase());
                return cb.equal(root.get("actionType"), enumVal);
            } catch (IllegalArgumentException e) {
                // kalau actionType gak valid → return false semua
                return cb.disjunction();
            }
        };
    }

    // 🔹 Filter berdasarkan Rentang Tanggal Aksi (actionAt)
    public static Specification<JobCertificationMappingHistory> byDateRange(Instant start, Instant end) {
        return (root, query, cb) -> {
            if (start == null && end == null) {
                return cb.conjunction();
            }
            if (start != null && end != null) {
                return cb.between(root.get("actionAt"), start, end);
            }
            if (start != null) {
                return cb.greaterThanOrEqualTo(root.get("actionAt"), start);
            }
            return cb.lessThanOrEqualTo(root.get("actionAt"), end);
        };
    }

    // 🔹 Filter pencarian bebas (jobName / certCode / subField)
    public static Specification<JobCertificationMappingHistory> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction();
            }
            String like = "%" + keyword.trim().toLowerCase() + "%";
            return cb.or(
                    cb.like(cb.lower(root.get("jobName")), like),
                    cb.like(cb.lower(root.get("certificationCode")), like),
                    cb.like(cb.lower(root.get("subFieldCode")), like));
        };
    }

    // 🔹 Filter berdasarkan PIC scope (allowed certification IDs)
    // join: history.mapping.certificationRule.certification.id
    public static Specification<JobCertificationMappingHistory> byAllowedCertificationIds(
            List<Long> allowedCertificationIds) {
        return (root, query, cb) -> {
            if (allowedCertificationIds == null || allowedCertificationIds.isEmpty()) {
                // ga ada filter kalau kosong/null
                return cb.conjunction();
            }
            return root
                    .get("mapping")
                    .get("certificationRule")
                    .get("certification")
                    .get("id")
                    .in(allowedCertificationIds);
        };
    }
}
