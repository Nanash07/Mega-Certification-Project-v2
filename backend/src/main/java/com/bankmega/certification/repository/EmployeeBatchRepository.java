// src/main/java/com/bankmega/certification/repository/EmployeeBatchRepository.java
package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Batch;
import com.bankmega.certification.entity.EmployeeBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface EmployeeBatchRepository
        extends JpaRepository<EmployeeBatch, Long>, JpaSpecificationExecutor<EmployeeBatch> {
    List<EmployeeBatch> findByBatch_IdAndDeletedAtIsNull(Long batchId);

    Optional<EmployeeBatch> findByIdAndDeletedAtIsNull(Long id);

    Optional<EmployeeBatch> findByBatch_IdAndEmployee_IdAndDeletedAtIsNull(Long batchId, Long employeeId);

    Optional<EmployeeBatch> findByBatch_IdAndEmployee_Id(Long batchId, Long employeeId);

    boolean existsByBatch_IdAndEmployee_IdAndDeletedAtIsNull(Long batchId, Long employeeId);

    long countByBatch_IdAndDeletedAtIsNull(Long batchId);

    long countByBatch_IdAndStatusAndDeletedAtIsNull(Long batchId, EmployeeBatch.Status status);

    List<EmployeeBatch> findByEmployee_IdAndBatch_CertificationRule_IdAndDeletedAtIsNull(Long employeeId, Long ruleId);

    List<EmployeeBatch> findByBatch_StatusInAndDeletedAtIsNull(List<Batch.Status> statuses);
}
