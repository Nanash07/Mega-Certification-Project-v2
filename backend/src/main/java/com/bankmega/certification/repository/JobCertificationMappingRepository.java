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

    @Override
    @EntityGraph(attributePaths = {
            "jobPosition",
            "certificationRule",
            "certificationRule.certification",
            "certificationRule.certificationLevel",
            "certificationRule.subField"
    })
    @org.springframework.lang.NonNull
    org.springframework.data.domain.Page<JobCertificationMapping> findAll(
            @org.springframework.lang.Nullable org.springframework.data.jpa.domain.Specification<JobCertificationMapping> spec,
            @org.springframework.lang.NonNull org.springframework.data.domain.Pageable pageable);
}