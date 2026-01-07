// src/main/java/com/bankmega/certification/repository/BatchRepository.java

package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BatchRepository extends JpaRepository<Batch, Long>, JpaSpecificationExecutor<Batch> {
    Optional<Batch> findByIdAndDeletedAtIsNull(Long id);

    @Override
    @EntityGraph(attributePaths = {
            "certificationRule",
            "certificationRule.certification",
            "certificationRule.certificationLevel",
            "certificationRule.subField",
            "certificationRule.refreshmentType",
            "institution"
    })
    Page<Batch> findAll(Specification<Batch> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {
            "certificationRule",
            "certificationRule.certification",
            "certificationRule.certificationLevel",
            "certificationRule.subField",
            "certificationRule.refreshmentType",
            "institution"
    })
    List<Batch> findAll(Specification<Batch> spec, Sort sort);

    @Override
    @EntityGraph(attributePaths = {
            "certificationRule",
            "certificationRule.certification",
            "certificationRule.certificationLevel",
            "certificationRule.subField",
            "certificationRule.refreshmentType",
            "institution"
    })
    List<Batch> findAll(Specification<Batch> spec);
}