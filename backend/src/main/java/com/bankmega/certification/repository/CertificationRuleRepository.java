package com.bankmega.certification.repository;

import com.bankmega.certification.entity.CertificationRule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Optional;

public interface CertificationRuleRepository
                extends JpaRepository<CertificationRule, Long>, JpaSpecificationExecutor<CertificationRule> {

        @EntityGraph(attributePaths = { "certification", "certificationLevel", "subField" })
        List<CertificationRule> findWithRelationsByDeletedAtIsNull();

        @EntityGraph(attributePaths = { "certification", "certificationLevel", "subField" })
        List<CertificationRule> findWithRelationsByIsActiveTrueAndDeletedAtIsNull();

        // 🔹 Ambil semua rule yang belum soft-delete
        List<CertificationRule> findByDeletedAtIsNull();

        // 🔹 Cari rule by ID tapi exclude yang deleted
        Optional<CertificationRule> findByIdAndDeletedAtIsNull(Long id);

        // 🔹 Cek kombinasi unik (Certification + Level + SubField) by ID
        Optional<CertificationRule> findByCertification_IdAndCertificationLevel_IdAndSubField_Id(
                        Long certificationId,
                        Long certificationLevelId,
                        Long subFieldId);

        // 🔹 Ambil rule aktif (isActive = true dan belum soft-delete)
        List<CertificationRule> findByIsActiveTrueAndDeletedAtIsNull();

        // 🔹 Paging semua rule aktif
        Page<CertificationRule> findByIsActiveTrueAndDeletedAtIsNull(Pageable pageable);

        // 🔹 Paging semua rule (soft-delete aware)
        Page<CertificationRule> findByDeletedAtIsNull(Pageable pageable);

        // 🔹 Cari rule by Certification Code (case-insensitive)
        List<CertificationRule> findByCertification_CodeIgnoreCaseAndDeletedAtIsNull(String code);

        // 🔹 Cari rule by Certification Code + Level (numeric) + SubField Code
        Optional<CertificationRule> findByCertification_CodeIgnoreCaseAndCertificationLevel_LevelAndSubField_CodeIgnoreCaseAndDeletedAtIsNull(
                        String code,
                        Integer level,
                        String subFieldCode);
}