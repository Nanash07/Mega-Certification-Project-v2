// src/main/java/com/bankmega/certification/repository/EmployeeRepository.java
package com.bankmega.certification.repository;

import com.bankmega.certification.entity.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    @EntityGraph(attributePaths = { "regional", "division", "unit", "jobPosition" })
    List<Employee> findWithRelationsByStatusIgnoreCaseNotAndDeletedAtIsNull(String status);

    interface NipOnly {
        String getNip();
    }

    List<NipOnly> findAllBy();

    // ========= soft delete "hapus dari sistem" =========
    List<Employee> findByDeletedAtIsNull();

    Optional<Employee> findByIdAndDeletedAtIsNull(Long id);

    Optional<Employee> findByNipAndDeletedAtIsNull(String nip);

    boolean existsByNipAndDeletedAtIsNull(String nip);

    List<Employee> findByNipInAndDeletedAtIsNull(Set<String> nips);

    List<Employee> findByNipNotInAndDeletedAtIsNull(Collection<String> nips);

    List<Employee> findByIdInAndDeletedAtIsNull(List<Long> ids);

    // ========= all (active + resigned + etc) =========
    Optional<Employee> findByNip(String nip);

    List<Employee> findByNipIn(Set<String> nips);

    List<Employee> findByNipIn(Collection<String> nips);

    // ========= deleted only =========
    List<Employee> findByDeletedAtIsNotNull();

    Page<Employee> findByDeletedAtIsNotNull(Pageable pageable);

    List<Employee> findByIdInAndDeletedAtIsNotNull(List<Long> ids);

    // ========= status helpers (buat dropdown & uniqueness yang lebih proper)
    // =========
    List<Employee> findByStatusIgnoreCaseNotAndDeletedAtIsNull(String status);

    boolean existsByNipIgnoreCaseAndDeletedAtIsNull(String nip);

    // constraints
    boolean existsByRegional(Regional regional);

    boolean existsByDivision(Division division);

    boolean existsByUnit(Unit unit);

    boolean existsByJobPosition(JobPosition jobPosition);

    @Override
    @EntityGraph(attributePaths = { "regional", "division", "unit", "jobPosition" })
    Page<Employee> findAll(Specification<Employee> spec, Pageable pageable);
}
