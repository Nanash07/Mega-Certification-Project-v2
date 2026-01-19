package com.bankmega.certification.repository;

import com.bankmega.certification.entity.EmployeePosition;
import com.bankmega.certification.entity.EmployeePosition.PositionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeePositionRepository extends JpaRepository<EmployeePosition, Long> {

    List<EmployeePosition> findByEmployeeIdAndDeletedAtIsNull(Long employeeId);

    Optional<EmployeePosition> findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(Long employeeId, PositionType type);

    @Query("SELECT ep FROM EmployeePosition ep " +
            "LEFT JOIN FETCH ep.regional " +
            "LEFT JOIN FETCH ep.division " +
            "LEFT JOIN FETCH ep.unit " +
            "LEFT JOIN FETCH ep.jobPosition " +
            "WHERE ep.employee.id IN :employeeIds AND ep.deletedAt IS NULL")
    List<EmployeePosition> findWithRelationsByEmployeeIds(@Param("employeeIds") Collection<Long> ids);

    @Query("SELECT ep FROM EmployeePosition ep " +
            "LEFT JOIN FETCH ep.regional " +
            "LEFT JOIN FETCH ep.division " +
            "LEFT JOIN FETCH ep.unit " +
            "LEFT JOIN FETCH ep.jobPosition " +
            "WHERE ep.employee.id = :employeeId AND ep.deletedAt IS NULL")
    List<EmployeePosition> findWithRelationsByEmployeeId(@Param("employeeId") Long employeeId);

    void deleteByEmployeeId(Long employeeId);
}
