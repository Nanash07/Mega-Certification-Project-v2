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

        Optional<JobCertificationMapping> findByJobPositionAndCertificationRule(JobPosition job,
                        CertificationRule rule);

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

        // ================== FILTER OPTIONS ==================

        @org.springframework.data.jpa.repository.Query(value = "SELECT DISTINCT m.jobPosition FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.jobPosition.name) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY m.jobPosition.name ASC", countQuery = "SELECT COUNT(DISTINCT m.jobPosition) FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.jobPosition.name) LIKE LOWER(CONCAT('%', :search, '%')))")
        org.springframework.data.domain.Page<JobPosition> findDistinctJobPositions(
                        @org.springframework.data.repository.query.Param("search") String search,
                        org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.Query(value = "SELECT DISTINCT m.certificationRule.certification FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.certification.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.certificationRule.certification.code) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY m.certificationRule.certification.name ASC", countQuery = "SELECT COUNT(DISTINCT m.certificationRule.certification) FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.certification.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.certificationRule.certification.code) LIKE LOWER(CONCAT('%', :search, '%')))")
        org.springframework.data.domain.Page<com.bankmega.certification.entity.Certification> findDistinctCertifications(
                        @org.springframework.data.repository.query.Param("search") String search,
                        org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.Query(value = "SELECT DISTINCT m.certificationRule.certificationLevel FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.certificationLevel.name) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY m.certificationRule.certificationLevel.level ASC", countQuery = "SELECT COUNT(DISTINCT m.certificationRule.certificationLevel) FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.certificationLevel.name) LIKE LOWER(CONCAT('%', :search, '%')))")
        org.springframework.data.domain.Page<com.bankmega.certification.entity.CertificationLevel> findDistinctCertificationLevels(
                        @org.springframework.data.repository.query.Param("search") String search,
                        org.springframework.data.domain.Pageable pageable);

        @org.springframework.data.jpa.repository.Query(value = "SELECT DISTINCT m.certificationRule.subField FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.subField.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.certificationRule.subField.code) LIKE LOWER(CONCAT('%', :search, '%'))) ORDER BY m.certificationRule.subField.name ASC", countQuery = "SELECT COUNT(DISTINCT m.certificationRule.subField) FROM JobCertificationMapping m WHERE m.deletedAt IS NULL AND (:search IS NULL OR LOWER(m.certificationRule.subField.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(m.certificationRule.subField.code) LIKE LOWER(CONCAT('%', :search, '%')))")
        org.springframework.data.domain.Page<com.bankmega.certification.entity.SubField> findDistinctSubFields(
                        @org.springframework.data.repository.query.Param("search") String search,
                        org.springframework.data.domain.Pageable pageable);
}