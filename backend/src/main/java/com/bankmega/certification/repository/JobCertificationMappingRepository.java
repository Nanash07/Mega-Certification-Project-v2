package com.bankmega.certification.repository;

import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.JobCertificationMapping;
import com.bankmega.certification.entity.JobPosition;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface JobCertificationMappingRepository extends
        JpaRepository<JobCertificationMapping, Long>,
        JpaSpecificationExecutor<JobCertificationMapping> {

    Optional<JobCertificationMapping> findByIdAndDeletedAtIsNull(Long id);

    boolean existsByJobPosition_IdAndCertificationRule_IdAndDeletedAtIsNull(Long jobPositionId, Long ruleId);

    Optional<JobCertificationMapping> findByJobPositionAndCertificationRule(JobPosition job, CertificationRule rule);

    List<JobCertificationMapping> findByJobPosition_IdAndDeletedAtIsNull(Long jobId);

    @EntityGraph(attributePaths = { "jobPosition", "certificationRule" })
    List<JobCertificationMapping> findWithRelationsByDeletedAtIsNull();
}