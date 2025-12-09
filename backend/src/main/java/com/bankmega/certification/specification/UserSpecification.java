package com.bankmega.certification.specification;

import com.bankmega.certification.entity.User;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class UserSpecification {

    // 🔹 Filter hanya user yang belum dihapus (soft delete)
    public static Specification<User> notDeleted() {
        return (root, query, cb) -> cb.isNull(root.get("deletedAt"));
    }

    // 🔹 Filter berdasarkan roleId
    public static Specification<User> byRoleId(Long roleId) {
        return (root, query, cb) -> {
            if (roleId == null) {
                return cb.conjunction(); // skip filter
            }
            return cb.equal(root.get("role").get("id"), roleId);
        };
    }

    // 🔹 Filter berdasarkan status aktif (opsional)
    public static Specification<User> byIsActive(Boolean isActive) {
        return (root, query, cb) -> {
            if (isActive == null) {
                return cb.conjunction(); // skip kalau null
            }
            return cb.equal(root.get("isActive"), isActive);
        };
    }

    public static Specification<User> byUsername(String username) {
        return (root, query, cb) -> {
            if (username == null || username.trim().isEmpty())
                return cb.conjunction();
            String like = "%" + username.toLowerCase() + "%";
            return cb.like(cb.lower(root.get("username")), like);
        };
    }

    // 🔹 Pencarian bebas (username / email / nama / nip pegawai)
    public static Specification<User> bySearch(String keyword) {
        return (root, query, cb) -> {
            if (keyword == null || keyword.trim().isEmpty()) {
                return cb.conjunction(); // skip kalau kosong
            }

            String like = "%" + keyword.trim().toLowerCase() + "%";

            // left join ke employee (karena gak semua user punya employee)
            var empJoin = root.join("employee", JoinType.LEFT);

            return cb.or(
                    cb.like(cb.lower(root.get("username")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(empJoin.get("name")), like),
                    cb.like(cb.lower(empJoin.get("nip")), like));
        };
    }

    /**
     * 🔐 Exclude users dengan role tertentu (misal SUPERADMIN, PIC)
     */
    public static Specification<User> excludeRoles(List<String> roleNames) {
        return (root, query, cb) -> {
            if (roleNames == null || roleNames.isEmpty()) {
                return cb.conjunction();
            }

            Join<User, ?> roleJoin = root.join("role", JoinType.LEFT);

            var upperNames = roleNames.stream()
                    .filter(n -> n != null && !n.isBlank())
                    .map(String::toUpperCase)
                    .toList();

            return cb.not(cb.upper(roleJoin.get("name")).in(upperNames));
        };
    }
}
