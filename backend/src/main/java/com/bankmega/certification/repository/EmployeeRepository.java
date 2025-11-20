package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Division;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.JobPosition;
import com.bankmega.certification.entity.Regional;
import com.bankmega.certification.entity.Unit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {

    // ==== Projection buat ambil NIP doang ====
    interface NipOnly {
        String getNip();
    }

    List<NipOnly> findAllBy();

    // ==== Soft Delete Aware Queries ====
    List<Employee> findByDeletedAtIsNull();

    Optional<Employee> findByIdAndDeletedAtIsNull(Long id);

    Optional<Employee> findByNipAndDeletedAtIsNull(String nip);

    boolean existsByNipAndDeletedAtIsNull(String nip);

    // ✅ Tambahin ini biar bisa dipake di import resign detection
    List<Employee> findByNipInAndDeletedAtIsNull(Set<String> nips);

    // ==== Hard find (termasuk yg soft deleted) ====
    Optional<Employee> findByNip(String nip);

    // ==== Batch Operations ====
    List<Employee> findByNipIn(Set<String> nips);

    // ==== Constraints (dipakai sebelum delete master data) ====
    boolean existsByRegional(Regional regional);

    boolean existsByDivision(Division division);

    boolean existsByUnit(Unit unit);

    boolean existsByJobPosition(JobPosition jobPosition);

    List<Employee> findByNipNotInAndDeletedAtIsNull(Collection<String> nips);

    List<Employee> findByNipIn(Collection<String> nips);

    List<Employee> findByIdInAndDeletedAtIsNull(List<Long> ids);

}
