package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeCertificationRequest;
import com.bankmega.certification.dto.EmployeeCertificationResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeCertificationSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EmployeeCertificationService {

    private final EmployeeCertificationRepository repo;
    private final EmployeeRepository employeeRepo;
    private final CertificationRuleRepository ruleRepo;
    private final InstitutionRepository institutionRepo;
    private final FileStorageService fileStorageService;
    private final EmployeeCertificationHistoryService historyService;

    // ================== Mapper ==================
    private EmployeeCertificationResponse toResponse(EmployeeCertification ec) {
        return EmployeeCertificationResponse.builder()
                .id(ec.getId())
                .employeeId(ec.getEmployee().getId())
                .nip(ec.getEmployee().getNip())
                .employeeName(ec.getEmployee().getName())
                .jobPositionTitle(ec.getJobPositionTitle())
                .certificationRuleId(ec.getCertificationRule().getId())
                .certificationName(ec.getCertificationRule().getCertification().getName())
                .certificationCode(ec.getCertificationRule().getCertification().getCode())
                .certificationLevelName(ec.getCertificationRule().getCertificationLevel() != null
                        ? ec.getCertificationRule().getCertificationLevel().getName()
                        : null)
                .certificationLevelLevel(ec.getCertificationRule().getCertificationLevel() != null
                        ? ec.getCertificationRule().getCertificationLevel().getLevel()
                        : null)
                .subFieldCode(ec.getCertificationRule().getSubField() != null
                        ? ec.getCertificationRule().getSubField().getCode()
                        : null)
                .subFieldName(ec.getCertificationRule().getSubField() != null
                        ? ec.getCertificationRule().getSubField().getName()
                        : null)
                .institutionId(ec.getInstitution() != null ? ec.getInstitution().getId() : null)
                .institutionName(ec.getInstitution() != null ? ec.getInstitution().getName() : null)
                .certNumber(ec.getCertNumber())
                .certDate(ec.getCertDate())
                .validFrom(ec.getValidFrom())
                .validUntil(ec.getValidUntil())
                .reminderDate(ec.getReminderDate())
                .fileUrl(ec.getFileUrl())
                .fileName(ec.getFileName())
                .fileType(ec.getFileType())
                .status(ec.getStatus())
                .processType(ec.getProcessType())
                .createdAt(ec.getCreatedAt())
                .updatedAt(ec.getUpdatedAt())
                .deletedAt(ec.getDeletedAt())
                .build();
    }

    // ================== Helpers ==================
    private void updateValidity(EmployeeCertification ec) {
        if (ec.getCertDate() != null) {
            ec.setValidFrom(ec.getCertDate());

            if (ec.getRuleValidityMonths() != null) {
                ec.setValidUntil(ec.getCertDate().plusMonths(ec.getRuleValidityMonths()));
            }
            if (ec.getRuleReminderMonths() != null && ec.getValidUntil() != null) {
                ec.setReminderDate(ec.getValidUntil().minusMonths(ec.getRuleReminderMonths()));
            }
        }
    }

    private void updateStatus(EmployeeCertification ec) {
        LocalDate today = LocalDate.now();

        if (ec.getCertNumber() == null || ec.getCertNumber().isBlank()
                || ec.getFileUrl() == null || ec.getFileUrl().isBlank()) {
            ec.setStatus(EmployeeCertification.Status.PENDING);
            return;
        }

        if (ec.getValidUntil() == null) {
            ec.setStatus(EmployeeCertification.Status.NOT_YET_CERTIFIED);
        } else if (today.isAfter(ec.getValidUntil())) {
            ec.setStatus(EmployeeCertification.Status.EXPIRED);
        } else if (ec.getReminderDate() != null && !today.isBefore(ec.getReminderDate())) {
            ec.setStatus(EmployeeCertification.Status.DUE);
        } else {
            ec.setStatus(EmployeeCertification.Status.ACTIVE);
        }
    }

    private boolean hasChanged(EmployeeCertification ec, EmployeeCertificationRequest req) {
        return !Objects.equals(ec.getCertNumber(), req.getCertNumber()) ||
                !Objects.equals(ec.getCertDate(), req.getCertDate()) ||
                !Objects.equals(ec.getProcessType(), req.getProcessType()) ||
                (req.getInstitutionId() != null &&
                        (ec.getInstitution() == null
                                || !Objects.equals(ec.getInstitution().getId(), req.getInstitutionId())))
                ||
                (req.getCertificationRuleId() != null &&
                        !Objects.equals(ec.getCertificationRule().getId(), req.getCertificationRuleId()));
    }

    // ================== Create ==================
    @Transactional
    public EmployeeCertificationResponse create(EmployeeCertificationRequest req) {
        Employee employee = employeeRepo.findById(req.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        CertificationRule rule = ruleRepo.findById(req.getCertificationRuleId())
                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));

        Institution institution = req.getInstitutionId() != null
                ? institutionRepo.findById(req.getInstitutionId()).orElse(null)
                : null;

        repo.findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(employee.getId(), rule.getId())
                .ifPresent(ec -> {
                    throw new RuntimeException("Certification already exists for this employee & rule");
                });

        EmployeeCertification ec = EmployeeCertification.builder()
                .employee(employee)
                .certificationRule(rule)
                .institution(institution)
                .certNumber(req.getCertNumber())
                .certDate(req.getCertDate())
                .processType(req.getProcessType())
                .jobPositionTitle(employee.getJobPosition() != null
                        ? employee.getJobPosition().getName()
                        : null)
                .ruleValidityMonths(rule.getValidityMonths()) // 🔹 snapshot rule setting
                .ruleReminderMonths(rule.getReminderMonths())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        updateValidity(ec);
        updateStatus(ec);

        // ✅ Simpan ke DB dulu
        EmployeeCertification saved = repo.save(ec);

        // ✅ Tambahkan histori CREATED (⬅️ ini barunya)
        historyService.snapshot(saved, EmployeeCertificationHistory.ActionType.CREATED);

        return toResponse(saved);
    }

    // ================== Update ==================
    @Transactional
    public EmployeeCertificationResponse update(Long id, EmployeeCertificationRequest req) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        if (!hasChanged(ec, req)) {
            return toResponse(ec); // ⛔ Skip kalau tidak ada perubahan
        }

        if (req.getCertificationRuleId() != null) {
            CertificationRule rule = ruleRepo.findById(req.getCertificationRuleId())
                    .orElseThrow(() -> new RuntimeException("Certification Rule not found"));
            ec.setCertificationRule(rule);
            ec.setRuleValidityMonths(rule.getValidityMonths()); // 🔹 update snapshot
            ec.setRuleReminderMonths(rule.getReminderMonths());
        }

        if (req.getInstitutionId() != null) {
            Institution institution = institutionRepo.findById(req.getInstitutionId()).orElse(null);
            ec.setInstitution(institution);
        }

        ec.setCertNumber(req.getCertNumber());
        ec.setCertDate(req.getCertDate());
        ec.setProcessType(req.getProcessType());
        ec.setUpdatedAt(Instant.now());

        updateValidity(ec);
        updateStatus(ec);

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, EmployeeCertificationHistory.ActionType.UPDATED);

        return toResponse(saved);
    }

    // ================== Soft Delete ==================
    @Transactional
    public void softDelete(Long id) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        ec.setDeletedAt(LocalDateTime.now());
        ec.setStatus(EmployeeCertification.Status.INVALID);
        ec.setUpdatedAt(Instant.now());

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, EmployeeCertificationHistory.ActionType.DELETED);
    }

    // ================== Handle File Update ==================
    private EmployeeCertification handleFileUpdate(EmployeeCertification ec,
            MultipartFile file,
            boolean isReupload,
            boolean isDelete,
            EmployeeCertificationHistory.ActionType actionType) {
        if (isDelete) {
            fileStorageService.deleteCertificate(ec.getId());
            ec.setFileUrl(null);
            ec.setFileName(null);
            ec.setFileType(null);
        } else {
            if (isReupload) {
                fileStorageService.deleteCertificate(ec.getId());
            }
            String fileUrl = fileStorageService.save(ec.getId(), file);
            ec.setFileUrl(fileUrl);
            ec.setFileName(file.getOriginalFilename());
            ec.setFileType(file.getContentType());
        }

        ec.setUpdatedAt(Instant.now());
        updateStatus(ec);

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, actionType);

        return saved;
    }

    // ================== Upload Certificate ==================
    @Transactional
    public EmployeeCertificationResponse uploadCertificate(Long id, MultipartFile file) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        return toResponse(handleFileUpdate(ec, file, false, false,
                EmployeeCertificationHistory.ActionType.UPLOAD_CERTIFICATE));
    }

    // ================== Reupload Certificate ==================
    @Transactional
    public EmployeeCertificationResponse reuploadCertificate(Long id, MultipartFile file) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        return toResponse(handleFileUpdate(ec, file, true, false,
                EmployeeCertificationHistory.ActionType.REUPLOAD_CERTIFICATE));
    }

    // ================== Delete Certificate ==================
    @Transactional
    public void deleteCertificate(Long id) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        handleFileUpdate(ec, null, false, true,
                EmployeeCertificationHistory.ActionType.DELETE_CERTIFICATE);
    }

    // ================== Detail ==================
    @Transactional(readOnly = true)
    public EmployeeCertificationResponse getDetail(Long id) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));
        return toResponse(ec);
    }

    // ================== Paging + Filter ==================
    @Transactional(readOnly = true)
    public Page<EmployeeCertificationResponse> getPagedFiltered(
            List<Long> employeeIds,
            List<String> certCodes,
            List<Integer> levels,
            List<String> subCodes,
            List<Long> institutionIds,
            List<String> statuses,
            String search,
            LocalDate certDateStart,
            LocalDate certDateEnd,
            LocalDate validUntilStart,
            LocalDate validUntilEnd,
            Pageable pageable) {
        Specification<EmployeeCertification> spec = EmployeeCertificationSpecification.notDeleted()
                .and(EmployeeCertificationSpecification.byEmployeeIds(employeeIds))
                .and(EmployeeCertificationSpecification.byCertCodes(certCodes))
                .and(EmployeeCertificationSpecification.byLevels(levels))
                .and(EmployeeCertificationSpecification.bySubCodes(subCodes))
                .and(EmployeeCertificationSpecification.byInstitutionIds(institutionIds))
                .and(EmployeeCertificationSpecification.byStatuses(statuses))
                .and(EmployeeCertificationSpecification.bySearch(search))
                .and(EmployeeCertificationSpecification.byCertDateRange(certDateStart, certDateEnd))
                .and(EmployeeCertificationSpecification.byValidUntilRange(validUntilStart, validUntilEnd));

        return repo.findAll(spec, pageable).map(this::toResponse);
    }
}
