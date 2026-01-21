package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.EmployeeBatch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

import java.util.List;
import java.util.Optional;

public interface EmployeeBatchRepository
        extends JpaRepository<EmployeeBatch, Long>, JpaSpecificationExecutor<EmployeeBatch> {

    List<EmployeeBatch> findByBatch_IdAndDeletedAtIsNull(Long batchId);

    @EntityGraph(attributePaths = { "employee" })
    List<EmployeeBatch> findWithEmployeeByBatch_IdAndDeletedAtIsNull(Long batchId);

    Optional<EmployeeBatch> findByIdAndDeletedAtIsNull(Long id);

    Optional<EmployeeBatch> findByBatch_IdAndEmployee_IdAndDeletedAtIsNull(Long batchId, Long employeeId);

    Optional<EmployeeBatch> findByBatch_IdAndEmployee_Id(Long batchId, Long employeeId);

    boolean existsByBatch_IdAndEmployee_IdAndDeletedAtIsNull(Long batchId, Long employeeId);

    long countByBatch_IdAndDeletedAtIsNull(Long batchId);

    long countByBatch_IdAndStatusAndDeletedAtIsNull(Long batchId, EmployeeBatch.Status status);

    List<EmployeeBatch> findByEmployee_IdAndBatch_CertificationRule_IdAndDeletedAtIsNull(Long employeeId, Long ruleId);

    List<EmployeeBatch> findByBatch_StatusInAndDeletedAtIsNull(List<Batch.Status> statuses);

    List<EmployeeBatch> findByBatch_IdAndEmployee_IdIn(Long batchId, List<Long> employeeIds);

    // ===================== EntityGraph overrides for eager fetch
    // =====================
    @Override
    @EntityGraph(attributePaths = {
            "employee",
            "employee.positions",
            "employee.positions.jobPosition",
            "employee.positions.division",
            "employee.positions.regional",
            "employee.positions.unit",
            "batch"
    })
    @NonNull
    Page<EmployeeBatch> findAll(@Nullable Specification<EmployeeBatch> spec, @NonNull Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {
            "employee",
            "employee.positions",
            "employee.positions.jobPosition",
            "employee.positions.division",
            "employee.positions.regional",
            "employee.positions.unit",
            "batch"
    })
    @NonNull
    List<EmployeeBatch> findAll(@Nullable Specification<EmployeeBatch> spec, @NonNull Sort sort);
}
