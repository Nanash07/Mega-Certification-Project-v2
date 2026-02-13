package com.bankmega.certification.specification;

import com.bankmega.certification.entity.EmployeeHistory;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;

public class EmployeeHistorySpecification {

    // 🔹 Filter berdasarkan ID Pegawai
    public static Specification<EmployeeHistory> byEmployeeId(Long employeeId) {
        return (root, query, cb) -> {
            if (employeeId == null) {
                return cb.conjunction(); // tanpa filter
            }
            return cb.equal(root.get("employee").get("id"), employeeId);
        };
    }

    // 🔹 Filter berdasarkan Action Type (CREATED, UPDATED, MUTASI, RESIGN,
    // TERMINATED)
    public static Specification<EmployeeHistory> byActionType(String actionType) {
        return (root, query, cb) -> {
            if (actionType == null || actionType.equalsIgnoreCase("all")) {
                return cb.conjunction(); // skip filter kalau all/null
            }
            try {
                EmployeeHistory.EmployeeActionType enumValue = EmployeeHistory.EmployeeActionType
                        .valueOf(actionType.toUpperCase());
                return cb.equal(root.get("actionType"), enumValue);
            } catch (IllegalArgumentException e) {
                // kalau param gak valid, hasil kosong
                return cb.disjunction();
            }
        };
    }

    public static Specification<EmployeeHistory> byDateRange(LocalDate startDate, LocalDate endDate) {
        return (root, query, cb) -> {
            if (startDate == null && endDate == null)
                return cb.conjunction();

            // Convert LocalDate ke Instant range
            // supaya bisa dibandingin dengan kolom actionAt (Instant)
            if (startDate != null && endDate != null) {
                return cb.between(root.get("actionAt"),
                        startDate.atStartOfDay().toInstant(java.time.ZoneOffset.UTC),
                        endDate.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC));
            } else if (startDate != null) {
                return cb.greaterThanOrEqualTo(root.get("actionAt"),
                        startDate.atStartOfDay().toInstant(java.time.ZoneOffset.UTC));
            } else if (endDate != null) {
                return cb.lessThanOrEqualTo(root.get("actionAt"),
                        endDate.plusDays(1).atStartOfDay().toInstant(java.time.ZoneOffset.UTC));
            }
            return cb.conjunction();
        };
    }

    // 🔹 Filter pencarian bebas (Nama/NIP/Jabatan/Unit/Divisi/Regional)
    public static Specification<EmployeeHistory> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction(); // tanpa filter kalau kosong
            }

            String like = "%" + keyword.trim().toLowerCase() + "%";

            return cb.or(
                    cb.like(cb.lower(root.get("employeeNip")), like),
                    cb.like(cb.lower(root.get("employeeName")), like),
                    cb.like(cb.lower(root.get("oldJobTitle")), like),
                    cb.like(cb.lower(root.get("newJobTitle")), like),
                    cb.like(cb.lower(root.get("newUnitName")), like),
                    cb.like(cb.lower(root.get("newDivisionName")), like),
                    cb.like(cb.lower(root.get("newRegionalName")), like));
        };
    }

    // 🔹 Filter Position Type (UTAMA/KEDUA)
    public static Specification<EmployeeHistory> byPositionType(String positionType) {
        return (root, query, cb) -> {
            if (positionType == null || positionType.isBlank() || "ALL".equalsIgnoreCase(positionType)) {
                return cb.conjunction();
            }
            return cb.equal(root.get("positionType"), positionType);
        };
    }
}
