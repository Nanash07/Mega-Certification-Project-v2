// src/main/java/com/bankmega/certification/repository/EmployeeRepository.java
package com.bankmega.certification.repository;

import com.bankmega.certification.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

        @EntityGraph(attributePaths = { "positions", "positions.regional",
                        "positions.division", "positions.unit", "positions.jobPosition" })
        List<Employee> findWithRelationsByStatusIgnoreCaseNotAndDeletedAtIsNull(String status);

        interface NipOnly {
                String getNip();
        }

        List<NipOnly> findAllBy();

        List<Employee> findByDeletedAtIsNull();

        // Optimized: Count without loading entities
        long countByDeletedAtIsNull();

        Optional<Employee> findByIdAndDeletedAtIsNull(Long id);

        Optional<Employee> findByNipAndDeletedAtIsNull(String nip);

        boolean existsByNipAndDeletedAtIsNull(String nip);

        List<Employee> findByNipInAndDeletedAtIsNull(Set<String> nips);

        List<Employee> findByNipNotInAndDeletedAtIsNull(Collection<String> nips);

        List<Employee> findByIdInAndDeletedAtIsNull(List<Long> ids);

        Optional<Employee> findByNip(String nip);

        List<Employee> findByNipIn(Set<String> nips);

        List<Employee> findByNipIn(Collection<String> nips);

        List<Employee> findByDeletedAtIsNotNull();

        Page<Employee> findByDeletedAtIsNotNull(Pageable pageable);

        List<Employee> findByIdInAndDeletedAtIsNotNull(List<Long> ids);

        List<Employee> findByStatusIgnoreCaseNotAndDeletedAtIsNull(String status);

        boolean existsByNipIgnoreCaseAndDeletedAtIsNull(String nip);

        @Query("SELECT COUNT(p) > 0 FROM EmployeePosition p WHERE p.regional = :regional AND p.deletedAt IS NULL")
        boolean existsByRegional(@Param("regional") Regional regional);

        @Query("SELECT COUNT(p) > 0 FROM EmployeePosition p WHERE p.division = :division AND p.deletedAt IS NULL")
        boolean existsByDivision(@Param("division") Division division);

        @Query("SELECT COUNT(p) > 0 FROM EmployeePosition p WHERE p.unit = :unit AND p.deletedAt IS NULL")
        boolean existsByUnit(@Param("unit") Unit unit);

        @Query("SELECT COUNT(p) > 0 FROM EmployeePosition p WHERE p.jobPosition = :jobPosition AND p.deletedAt IS NULL")
        boolean existsByJobPosition(@Param("jobPosition") JobPosition jobPosition);

        @Override
        @EntityGraph(attributePaths = { "positions", "positions.regional",
                        "positions.division", "positions.unit", "positions.jobPosition" })
        @NonNull
        Page<Employee> findAll(@Nullable Specification<Employee> spec, @NonNull Pageable pageable);

        @Query("SELECT DISTINCT e FROM Employee e " +
                        "LEFT JOIN FETCH e.positions p " +
                        "LEFT JOIN FETCH p.regional " +
                        "LEFT JOIN FETCH p.division " +
                        "LEFT JOIN FETCH p.unit " +
                        "LEFT JOIN FETCH p.jobPosition " +
                        "WHERE e.id = :id")
        Optional<Employee> findByIdWithPositions(@Param("id") Long id);

        // Optimized: Load all active employees with positions in single query
        @EntityGraph(attributePaths = { "positions", "positions.jobPosition",
                        "positions.regional", "positions.division", "positions.unit" })
        List<Employee> findWithRelationsByDeletedAtIsNull();
}
