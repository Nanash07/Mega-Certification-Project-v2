package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Division;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.JobPosition;
import com.bankmega.certification.entity.Regional;
import com.bankmega.certification.entity.Unit;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    interface NipOnly {
        String getNip();
    }

    List<NipOnly> findAllBy();

    // active only
    List<Employee> findByDeletedAtIsNull();

    Optional<Employee> findByIdAndDeletedAtIsNull(Long id);

    Optional<Employee> findByNipAndDeletedAtIsNull(String nip);

    boolean existsByNipAndDeletedAtIsNull(String nip);

    List<Employee> findByNipInAndDeletedAtIsNull(Set<String> nips);

    List<Employee> findByNipNotInAndDeletedAtIsNull(Collection<String> nips);

    List<Employee> findByIdInAndDeletedAtIsNull(List<Long> ids);

    // all (active + resigned)
    Optional<Employee> findByNip(String nip);

    List<Employee> findByNipIn(Set<String> nips);

    List<Employee> findByNipIn(Collection<String> nips);

    // resigned only
    List<Employee> findByDeletedAtIsNotNull();

    Page<Employee> findByDeletedAtIsNotNull(Pageable pageable);

    List<Employee> findByIdInAndDeletedAtIsNotNull(List<Long> ids);

    // constraints
    boolean existsByRegional(Regional regional);

    boolean existsByDivision(Division division);

    boolean existsByUnit(Unit unit);

    boolean existsByJobPosition(JobPosition jobPosition);
}
