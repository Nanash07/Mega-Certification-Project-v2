package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    List<User> findByDeletedAtIsNull();

    Optional<User> findByIdAndDeletedAtIsNull(Long id);

    Optional<User> findByUsernameAndDeletedAtIsNull(String username);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.role WHERE u.username = :username AND u.deletedAt IS NULL")
    Optional<User> findByUsernameWithRoleAndDeletedAtIsNull(@Param("username") String username);

    List<User> findByDeletedAtIsNotNull();

    Optional<User> findByEmailAndDeletedAtIsNull(String email);

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    List<User> findByRole_NameIgnoreCase(String roleName);

    long countByRole_Id(Long roleId);

    Optional<User> findByEmployee(Employee employee);

    List<User> findByUsernameIn(Collection<String> usernames);

    List<User> findByEmployee_IdIn(Collection<Long> employeeIds);

    // EntityGraph override for paging with eager fetch
    @Override
    @EntityGraph(attributePaths = { "role", "employee" })
    @NonNull
    Page<User> findAll(@Nullable Specification<User> spec, @NonNull Pageable pageable);

    @Override
    @EntityGraph(attributePaths = { "role", "employee" })
    @NonNull
    List<User> findAll(@Nullable Specification<User> spec);
}