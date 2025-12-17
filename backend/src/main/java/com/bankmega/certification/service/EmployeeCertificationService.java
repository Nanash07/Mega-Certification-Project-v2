package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeCertificationRequest;
import com.bankmega.certification.dto.EmployeeCertificationResponse;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.EmployeeCertificationHistory.ActionType;
import com.bankmega.certification.entity.Institution;
import com.bankmega.certification.event.EmployeeCertificationChangedEvent;
import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import com.bankmega.certification.repository.EmployeeEligibilityRepository;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.InstitutionRepository;
import com.bankmega.certification.specification.EmployeeCertificationSpecification;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeCertificationService {

    private final EmployeeCertificationRepository repo;
    private final EmployeeRepository employeeRepo;
    private final CertificationRuleRepository ruleRepo;
    private final InstitutionRepository institutionRepo;
    private final EmployeeEligibilityRepository eligibilityRepo;
    private final FileStorageService fileStorageService;
    private final EmployeeCertificationHistoryService historyService;
    private final ApplicationEventPublisher eventPublisher; // 🔹 NEW

    @PersistenceContext
    private EntityManager em;

    // batching
    private static final int BATCH_SIZE = 500; // saveAll chunk size
    private static final int IN_CHUNK = 800; // query IN(...) chunk size

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
    /**
     * Hitung validFrom/validUntil/reminderDate. Fallback ke rule kalau snapshot
     * null.
     */
    private void updateValidity(EmployeeCertification ec) {
        Integer validityMonths = ec.getRuleValidityMonths();
        if (validityMonths == null && ec.getCertificationRule() != null) {
            validityMonths = ec.getCertificationRule().getValidityMonths();
            ec.setRuleValidityMonths(validityMonths);
        }
        Integer reminderMonths = ec.getRuleReminderMonths();
        if (reminderMonths == null && ec.getCertificationRule() != null) {
            reminderMonths = ec.getCertificationRule().getReminderMonths();
            ec.setRuleReminderMonths(reminderMonths);
        }

        if (ec.getCertDate() != null) {
            ec.setValidFrom(ec.getCertDate());

            if (validityMonths != null) {
                ec.setValidUntil(ec.getCertDate().plusMonths(validityMonths));
            } else {
                ec.setValidUntil(null);
            }

            if (ec.getValidUntil() != null && reminderMonths != null) {
                ec.setReminderDate(ec.getValidUntil().minusMonths(reminderMonths));
            } else {
                ec.setReminderDate(null);
            }
        } else {
            ec.setValidFrom(null);
            ec.setValidUntil(null);
            ec.setReminderDate(null);
        }
    }

    /** Tentukan status berdasarkan kelengkapan dokumen dan validity. */
    private void updateStatus(EmployeeCertification ec) {
        if (ec.getStatus() == EmployeeCertification.Status.INVALID) {
            return;
        }

        LocalDate today = LocalDate.now();

        if (ec.getCertNumber() == null || ec.getCertNumber().isBlank()
                || ec.getFileUrl() == null || ec.getFileUrl().isBlank()) {
            ec.setStatus(EmployeeCertification.Status.PENDING);
            return;
        }

        if (ec.getCertDate() == null) {
            ec.setStatus(EmployeeCertification.Status.NOT_YET_CERTIFIED);
            return;
        }

        if (ec.getValidUntil() == null) {
            ec.setStatus(EmployeeCertification.Status.ACTIVE);
            return;
        }

        if (today.isAfter(ec.getValidUntil())) {
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
                        (ec.getInstitution() == null ||
                                !Objects.equals(ec.getInstitution().getId(), req.getInstitutionId())))
                ||
                (req.getCertificationRuleId() != null &&
                        !Objects.equals(ec.getCertificationRule().getId(), req.getCertificationRuleId()));
    }

    private void batchSave(List<EmployeeCertification> list) {
        if (list == null || list.isEmpty())
            return;
        for (int i = 0; i < list.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, list.size());
            repo.saveAll(list.subList(i, end));
            em.flush();
            em.clear();
        }
    }

    /**
     * Reset counter training & refreshment di eligibility untuk (employee, rule).
     */
    private void resetCountersFor(Long employeeId, Long ruleId) {
        if (employeeId == null || ruleId == null)
            return;

        eligibilityRepo.findByEmployeeIdAndDeletedAtIsNull(employeeId).stream()
                .filter(ee -> ee.getCertificationRule() != null &&
                        Objects.equals(ee.getCertificationRule().getId(), ruleId))
                .findFirst()
                .ifPresent(ee -> {
                    ee.setTrainingCount(0);
                    ee.setRefreshmentCount(0);
                    ee.setUpdatedAt(Instant.now());
                    eligibilityRepo.save(ee);
                });
    }

    /** Reset counter jika sertifikat SERTIFIKASI valid (punya certDate). */
    private void maybeResetCounters(EmployeeCertification ec) {
        if (ec != null
                && ec.getProcessType() == EmployeeCertification.ProcessType.SERTIFIKASI
                && ec.getCertDate() != null) {
            resetCountersFor(ec.getEmployee().getId(), ec.getCertificationRule().getId());
        }
    }

    // ================== EVENT HELPERS ==================
    private void publishChangedEvent(EmployeeCertification ec) {
        if (ec == null || ec.getEmployee() == null || ec.getEmployee().getId() == null)
            return;
        eventPublisher.publishEvent(new EmployeeCertificationChangedEvent(ec.getEmployee().getId()));
    }

    private void publishChangedEventsForEmployeeIds(Collection<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return;
        employeeIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .forEach(id -> eventPublisher.publishEvent(new EmployeeCertificationChangedEvent(id)));
    }

    // ================== Create ==================
    @Transactional
    public EmployeeCertificationResponse create(EmployeeCertificationRequest req) {
        Employee employee = employeeRepo.findById(req.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        CertificationRule rule = ruleRepo.findById(req.getCertificationRuleId())
                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));

        Institution institution = (req.getInstitutionId() != null)
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
                .processType(
                        req.getProcessType() != null ? req.getProcessType()
                                : EmployeeCertification.ProcessType.SERTIFIKASI)
                .jobPositionTitle(employee.getJobPosition() != null
                        ? employee.getJobPosition().getName()
                        : null)
                .ruleValidityMonths(rule.getValidityMonths())
                .ruleReminderMonths(rule.getReminderMonths())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        updateValidity(ec);
        updateStatus(ec);

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, ActionType.CREATED);

        maybeResetCounters(saved);
        publishChangedEvent(saved); // 🔹 trigger refresh eligibility

        return toResponse(saved);
    }

    // ================== Update ==================
    @Transactional
    public EmployeeCertificationResponse update(Long id, EmployeeCertificationRequest req) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        if (!hasChanged(ec, req)) {
            return toResponse(ec);
        }

        if (req.getCertificationRuleId() != null &&
                !Objects.equals(ec.getCertificationRule().getId(), req.getCertificationRuleId())) {
            CertificationRule rule = ruleRepo.findById(req.getCertificationRuleId())
                    .orElseThrow(() -> new RuntimeException("Certification Rule not found"));
            ec.setCertificationRule(rule);
            ec.setRuleValidityMonths(rule.getValidityMonths());
            ec.setRuleReminderMonths(rule.getReminderMonths());
        }

        if (req.getInstitutionId() != null) {
            Institution institution = institutionRepo.findById(req.getInstitutionId()).orElse(null);
            ec.setInstitution(institution);
        }

        ec.setCertNumber(req.getCertNumber());
        ec.setCertDate(req.getCertDate());
        if (req.getProcessType() != null) {
            ec.setProcessType(req.getProcessType());
        }
        if (ec.getJobPositionTitle() == null || ec.getJobPositionTitle().isBlank()) {
            var jp = ec.getEmployee().getJobPosition();
            ec.setJobPositionTitle(jp != null ? jp.getName() : null);
        }
        ec.setUpdatedAt(Instant.now());

        updateValidity(ec);
        updateStatus(ec);

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, ActionType.UPDATED);

        maybeResetCounters(saved);
        publishChangedEvent(saved); // 🔹 trigger refresh eligibility

        return toResponse(saved);
    }

    // ================== Soft Delete (record) ==================
    @Transactional
    public void softDelete(Long id) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        ec.setDeletedAt(LocalDateTime.now());
        ec.setStatus(EmployeeCertification.Status.INVALID);
        ec.setUpdatedAt(Instant.now());

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, ActionType.DELETED);

        publishChangedEvent(saved); // 🔹 trigger refresh eligibility
    }

    // ================== Handle File Update ==================
    private EmployeeCertification handleFileUpdate(EmployeeCertification ec,
            MultipartFile file,
            boolean isReupload,
            boolean isDelete,
            ActionType actionType) {
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
        updateValidity(ec);
        updateStatus(ec);

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, actionType);

        publishChangedEvent(saved); // 🔹 trigger refresh eligibility

        return saved;
    }

    // ================== Upload Certificate ==================
    @Transactional
    public EmployeeCertificationResponse uploadCertificate(Long id, MultipartFile file) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        return toResponse(handleFileUpdate(ec, file, false, false, ActionType.UPLOAD_CERTIFICATE));
    }

    // ================== Reupload Certificate ==================
    @Transactional
    public EmployeeCertificationResponse reuploadCertificate(Long id, MultipartFile file) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        return toResponse(handleFileUpdate(ec, file, true, false, ActionType.REUPLOAD_CERTIFICATE));
    }

    // ================== Delete Certificate (file only) ==================
    @Transactional
    public void deleteCertificate(Long id) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        handleFileUpdate(ec, null, false, true, ActionType.DELETE_CERTIFICATE);
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

    // =========================================================
    // 🔥 Bulk ops optimized (chunked + only-changed writes)
    // =========================================================

    /** INVALID semua sertifikat milik pegawai-pegawai (mis. resign). */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int bulkInvalidateByEmployeeIds(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return 0;

        List<Long> ids = employeeIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty())
            return 0;

        int total = 0;
        for (List<Long> part : partition(ids, IN_CHUNK)) {
            List<EmployeeCertification> list = repo.findByEmployeeIdInAndDeletedAtIsNull(part);
            if (list.isEmpty())
                continue;

            List<EmployeeCertification> changed = new ArrayList<>(list.size());
            Instant now = Instant.now();

            for (EmployeeCertification ec : list) {
                if (ec.getStatus() != EmployeeCertification.Status.INVALID) {
                    ec.setStatus(EmployeeCertification.Status.INVALID);
                    ec.setUpdatedAt(now);
                    changed.add(ec);
                    historyService.snapshot(ec, ActionType.UPDATED);
                }
            }

            batchSave(changed);
            total += changed.size();

            // 🔹 publish event utk employee2 terkait
            publishChangedEventsForEmployeeIds(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

    /** Opsi rehire: INVALID -> PENDING. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int markInvalidToPendingForEmployeeIds(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return 0;

        List<Long> ids = employeeIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty())
            return 0;

        int total = 0;
        for (List<Long> part : partition(ids, IN_CHUNK)) {
            List<EmployeeCertification> list = repo.findByEmployeeIdInAndDeletedAtIsNull(part);
            if (list.isEmpty())
                continue;

            List<EmployeeCertification> changed = new ArrayList<>();
            Instant now = Instant.now();

            for (EmployeeCertification ec : list) {
                if (ec.getStatus() == EmployeeCertification.Status.INVALID) {
                    ec.setStatus(EmployeeCertification.Status.PENDING);
                    ec.setUpdatedAt(now);
                    updateValidity(ec);
                    updateStatus(ec);
                    changed.add(ec);
                    historyService.snapshot(ec, ActionType.UPDATED);
                }
            }

            batchSave(changed);
            total += changed.size();

            publishChangedEventsForEmployeeIds(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

    /** Recompute status utk pegawai-pegawai tertentu. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int recomputeStatusesForEmployeeIds(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return 0;

        List<Long> ids = employeeIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty())
            return 0;

        int total = 0;
        for (List<Long> part : partition(ids, IN_CHUNK)) {
            List<EmployeeCertification> list = repo.findByEmployeeIdInAndDeletedAtIsNull(part);
            if (list.isEmpty())
                continue;

            List<EmployeeCertification> changed = new ArrayList<>();
            Instant now = Instant.now();

            for (EmployeeCertification ec : list) {
                EmployeeCertification.Status before = ec.getStatus();
                updateValidity(ec);
                updateStatus(ec);
                if (before != ec.getStatus()) {
                    ec.setUpdatedAt(now);
                    changed.add(ec);
                    historyService.snapshot(ec, ActionType.UPDATED);
                }
            }

            batchSave(changed);
            total += changed.size();

            publishChangedEventsForEmployeeIds(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

    // ================== Util single-employee ==================
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int invalidateByEmployeeId(Long employeeId) {
        if (employeeId == null)
            return 0;

        List<EmployeeCertification> list = repo.findByEmployeeIdAndDeletedAtIsNull(employeeId);
        if (list.isEmpty())
            return 0;

        List<EmployeeCertification> changed = new ArrayList<>();
        Instant now = Instant.now();

        for (EmployeeCertification ec : list) {
            if (ec.getStatus() != EmployeeCertification.Status.INVALID) {
                ec.setStatus(EmployeeCertification.Status.INVALID);
                ec.setUpdatedAt(now);
                changed.add(ec);
                historyService.snapshot(ec, ActionType.UPDATED);
            }
        }
        batchSave(changed);

        if (!changed.isEmpty()) {
            publishChangedEvent(changed.get(0)); // satu employeeId saja
        }

        return changed.size();
    }

    // ================== internal helpers ==================
    private static <T> List<List<T>> partition(Collection<T> src, int size) {
        List<T> list = (src instanceof List<T> l) ? l : new ArrayList<>(src);
        int n = list.size();
        List<List<T>> chunks = new ArrayList<>((n + size - 1) / size);
        for (int i = 0; i < n; i += size) {
            chunks.add(list.subList(i, Math.min(i + size, n)));
        }
        return chunks;
    }
}
