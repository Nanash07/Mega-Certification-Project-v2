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
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

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
                        "institution"
        })
        @NonNull
        Page<Batch> findAll(@Nullable Specification<Batch> spec, @NonNull Pageable pageable);

        @Override
        @EntityGraph(attributePaths = {
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField",
                        "institution"
        })
        @NonNull
        List<Batch> findAll(@Nullable Specification<Batch> spec, @NonNull Sort sort);

        @Override
        @EntityGraph(attributePaths = {
                        "certificationRule",
                        "certificationRule.certification",
                        "certificationRule.certificationLevel",
                        "certificationRule.subField",
                        "institution"
        })
        @NonNull
        List<Batch> findAll(@Nullable Specification<Batch> spec);
}