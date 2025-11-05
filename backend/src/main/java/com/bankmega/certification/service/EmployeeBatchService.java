package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeBatchResponse;
import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeBatchSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EmployeeBatchService {

    private final EmployeeBatchRepository repo;
    private final BatchRepository batchRepo;
    private final EmployeeRepository employeeRepo;
    private final EmployeeEligibilityRepository eligibilityRepo;
    private final EmployeeCertificationRepository certificationRepo;
    private final EmployeeCertificationHistoryService historyService;

    // ================== MAPPER ==================
    private EmployeeBatchResponse toResponse(EmployeeBatch eb) {
        return EmployeeBatchResponse.builder()
                .id(eb.getId())
                .employeeId(eb.getEmployee().getId())
                .employeeNip(eb.getEmployee().getNip())
                .employeeName(eb.getEmployee().getName())
                .batchId(eb.getBatch().getId())
                .batchName(eb.getBatch().getBatchName())
                .status(eb.getStatus())
                .registrationDate(eb.getRegistrationDate())
                .attendedAt(eb.getAttendedAt())
                .resultDate(eb.getResultDate())
                .notes(eb.getNotes())
                .createdAt(eb.getCreatedAt())
                .updatedAt(eb.getUpdatedAt())
                .build();
    }

    private EmployeeEligibilityResponse toEligibilityResponse(EmployeeEligibility e) {
        Employee emp = e.getEmployee();
        return EmployeeEligibilityResponse.builder()
                .employeeId(emp != null ? emp.getId() : null)
                .nip(emp != null ? emp.getNip() : null)
                .employeeName(emp != null ? emp.getName() : null)
                .jobPositionTitle(emp != null && emp.getJobPosition() != null ? emp.getJobPosition().getName() : null)
                .certificationRuleId(e.getCertificationRule() != null ? e.getCertificationRule().getId() : null)
                .certificationCode(
                        e.getCertificationRule() != null && e.getCertificationRule().getCertification() != null
                                ? e.getCertificationRule().getCertification().getCode()
                                : null)
                .certificationName(
                        e.getCertificationRule() != null && e.getCertificationRule().getCertification() != null
                                ? e.getCertificationRule().getCertification().getName()
                                : null)
                .status(e.getStatus() != null ? e.getStatus().name() : null)
                .isActive(e.getIsActive())
                .build();
    }

    // ================== LIST ==================
    @Transactional(readOnly = true)
    public List<EmployeeBatchResponse> getByBatch(Long batchId) {
        return repo.findByBatch_IdAndDeletedAtIsNull(batchId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // ================== SEARCH + PAGING ==================
    @Transactional(readOnly = true)
    public Page<EmployeeBatchResponse> search(
            Long batchId,
            String search,
            EmployeeBatch.Status status,
            Pageable pageable) {
        Specification<EmployeeBatch> spec = EmployeeBatchSpecification.notDeleted()
                .and(EmployeeBatchSpecification.byBatch(batchId))
                .and(EmployeeBatchSpecification.byStatus(status))
                .and(EmployeeBatchSpecification.bySearch(search));

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(
                    pageable.getPageNumber(),
                    pageable.getPageSize(),
                    Sort.by(Sort.Order.asc("employee.nip")));
        }

        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    // ================== ADD SINGLE PARTICIPANT (restore if soft-deleted)
    // ==================
    @Transactional
    public EmployeeBatchResponse addParticipant(Long batchId, Long employeeId) {
        Batch batch = batchRepo.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found"));
        Employee emp = employeeRepo.findByIdAndDeletedAtIsNull(employeeId)
                .orElseThrow(() -> new NotFoundException("Employee not found"));

        long currentCount = repo.countByBatch_IdAndDeletedAtIsNull(batchId);
        if (batch.getQuota() != null && currentCount >= batch.getQuota()) {
            throw new IllegalStateException("Quota batch sudah penuh");
        }

        return repo.findByBatch_IdAndEmployee_Id(batchId, employeeId)
                .map(eb -> {
                    if (eb.getDeletedAt() == null) {
                        // sudah aktif
                        throw new IllegalStateException("Peserta sudah ada di batch ini");
                    }
                    // 🔁 restore
                    eb.setDeletedAt(null);
                    eb.setStatus(EmployeeBatch.Status.REGISTERED);
                    eb.setRegistrationDate(LocalDate.now());
                    eb.setUpdatedAt(Instant.now());
                    return toResponse(repo.save(eb));
                })
                .orElseGet(() -> {
                    EmployeeBatch eb = EmployeeBatch.builder()
                            .batch(batch)
                            .employee(emp)
                            .status(EmployeeBatch.Status.REGISTERED)
                            .registrationDate(LocalDate.now())
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    return toResponse(repo.save(eb));
                });
    }

    // ================== ADD MULTIPLE PARTICIPANTS (restore if soft-deleted)
    // ==================
    @Transactional
    public List<EmployeeBatchResponse> addParticipantsBulk(Long batchId, List<Long> employeeIds) {
        Batch batch = batchRepo.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found"));

        long currentCount = repo.countByBatch_IdAndDeletedAtIsNull(batchId);
        Integer quota = batch.getQuota();
        int remaining = quota == null ? Integer.MAX_VALUE : Math.max(0, quota - (int) currentCount);

        List<Long> ids = employeeIds == null ? List.of()
                : employeeIds.stream().filter(Objects::nonNull).distinct().toList();

        List<EmployeeBatchResponse> responses = new ArrayList<>();
        int added = 0;

        for (Long empId : ids) {
            if (added >= remaining)
                break;

            Employee emp = employeeRepo.findByIdAndDeletedAtIsNull(empId)
                    .orElseThrow(() -> new NotFoundException("Employee not found"));

            // cek termasuk soft-deleted
            var existingOpt = repo.findByBatch_IdAndEmployee_Id(batchId, empId);
            if (existingOpt.isPresent()) {
                EmployeeBatch eb = existingOpt.get();
                if (eb.getDeletedAt() == null) {
                    // sudah aktif -> skip
                    continue;
                }
                // 🔁 restore
                eb.setDeletedAt(null);
                eb.setStatus(EmployeeBatch.Status.REGISTERED);
                eb.setRegistrationDate(LocalDate.now());
                eb.setUpdatedAt(Instant.now());
                responses.add(toResponse(repo.save(eb)));
                added++;
                continue;
            }

            // tambah baru
            EmployeeBatch eb = EmployeeBatch.builder()
                    .batch(batch)
                    .employee(emp)
                    .status(EmployeeBatch.Status.REGISTERED)
                    .registrationDate(LocalDate.now())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            responses.add(toResponse(repo.save(eb)));
            added++;
        }

        return responses;
    }

    // ================== UPDATE STATUS (lock PASSED) ==================
    @Transactional
    public EmployeeBatchResponse updateStatus(
            Long id,
            EmployeeBatch.Status status,
            Integer score,
            String notes) {
        EmployeeBatch eb = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("EmployeeBatch not found"));

        EmployeeBatch.Status current = eb.getStatus();

        // ⛔ lock total saat sudah PASSED
        if (current == EmployeeBatch.Status.PASSED) {
            throw new IllegalStateException("Peserta sudah PASSED dan tidak dapat diubah lagi.");
        }

        // Validasi transisi
        if (status == EmployeeBatch.Status.ATTENDED && current != EmployeeBatch.Status.REGISTERED) {
            throw new IllegalStateException("Hanya peserta REGISTERED yang bisa jadi ATTENDED");
        }
        if ((status == EmployeeBatch.Status.PASSED || status == EmployeeBatch.Status.FAILED)
                && current != EmployeeBatch.Status.ATTENDED) {
            throw new IllegalStateException("Peserta harus ATTENDED dulu sebelum PASSED/FAILED");
        }

        eb.setStatus(status);
        if (status == EmployeeBatch.Status.ATTENDED && eb.getAttendedAt() == null) {
            eb.setAttendedAt(LocalDate.now());
        }
        if ((status == EmployeeBatch.Status.PASSED || status == EmployeeBatch.Status.FAILED)
                && eb.getResultDate() == null) {
            eb.setResultDate(LocalDate.now());
        }

        if (score != null)
            eb.setScore(score);
        if (notes != null)
            eb.setNotes(notes);
        eb.setUpdatedAt(Instant.now());

        EmployeeBatch saved = repo.save(eb);

        // ✅ Jika lulus, buat/update sertifikat pakai attempt terbaru
        if (status == EmployeeBatch.Status.PASSED) {
            createOrUpdateCertification(saved);
        }

        return toResponse(saved);
    }

    // ================== RETRY FAILED -> REGISTERED ==================
    @Transactional
    public EmployeeBatchResponse retryFailed(Long id) {
        EmployeeBatch eb = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("EmployeeBatch not found"));

        if (eb.getStatus() != EmployeeBatch.Status.FAILED) {
            throw new IllegalStateException("Hanya peserta FAILED yang bisa diulang.");
        }

        eb.setStatus(EmployeeBatch.Status.REGISTERED);
        eb.setAttendedAt(null);
        eb.setResultDate(null);
        eb.setScore(null);
        // eb.setNotes(null); // opsional: reset catatan
        eb.setUpdatedAt(Instant.now());

        return toResponse(repo.save(eb));
    }

    // ================== CREATE / UPDATE CERTIFICATION (attempt terbaru)
    // ==================
    private void createOrUpdateCertification(EmployeeBatch eb) {
        Employee emp = eb.getEmployee();
        CertificationRule rule = eb.getBatch().getCertificationRule();
        Institution institution = eb.getBatch().getInstitution();

        EmployeeCertification ec = certificationRepo
                .findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(emp.getId(), rule.getId())
                .orElse(null);

        boolean isNew = false;
        // Pakai tanggal hasil terbaru sebagai certDate
        LocalDate passDate = eb.getResultDate() != null ? eb.getResultDate() : LocalDate.now();

        if (ec == null) {
            ec = EmployeeCertification.builder()
                    .employee(emp)
                    .certificationRule(rule)
                    .institution(institution)
                    .certDate(passDate)
                    .processType(EmployeeCertification.ProcessType.SERTIFIKASI)
                    .status(EmployeeCertification.Status.PENDING)
                    // snapshot rule saat create
                    .ruleValidityMonths(rule != null ? rule.getValidityMonths() : null)
                    .ruleReminderMonths(rule != null ? rule.getReminderMonths() : null)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            isNew = true;
        } else {
            // update attempt terbaru
            ec.setCertDate(passDate);
            ec.setUpdatedAt(Instant.now());
            ec.setStatus((ec.getCertNumber() == null || ec.getCertNumber().isBlank())
                    ? EmployeeCertification.Status.PENDING
                    : EmployeeCertification.Status.ACTIVE);

            // pastikan snapshot ada
            if (ec.getRuleValidityMonths() == null && rule != null) {
                ec.setRuleValidityMonths(rule.getValidityMonths());
            }
            if (ec.getRuleReminderMonths() == null && rule != null) {
                ec.setRuleReminderMonths(rule.getReminderMonths());
            }
        }

        // Hitung validity + reminder (lifetime kalau validity null)
        if (ec.getCertDate() != null) {
            ec.setValidFrom(ec.getCertDate());

            Integer v = ec.getRuleValidityMonths() != null ? ec.getRuleValidityMonths()
                    : (rule != null ? rule.getValidityMonths() : null);
            Integer r = ec.getRuleReminderMonths() != null ? ec.getRuleReminderMonths()
                    : (rule != null ? rule.getReminderMonths() : null);

            if (v != null) {
                ec.setValidUntil(ec.getCertDate().plusMonths(v));
            } else {
                ec.setValidUntil(null); // non-expiring
            }

            if (ec.getValidUntil() != null && r != null) {
                ec.setReminderDate(ec.getValidUntil().minusMonths(r));
            } else {
                ec.setReminderDate(null);
            }
        } else {
            ec.setValidFrom(null);
            ec.setValidUntil(null);
            ec.setReminderDate(null);
        }

        EmployeeCertification saved = certificationRepo.save(ec);

        historyService.snapshot(saved,
                isNew ? EmployeeCertificationHistory.ActionType.CREATED
                        : EmployeeCertificationHistory.ActionType.UPDATED);
    }

    // ================== SOFT DELETE (hanya REGISTERED) ==================
    @Transactional
    public void removeParticipant(Long id) {
        EmployeeBatch eb = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("EmployeeBatch not found"));

        if (eb.getStatus() != EmployeeBatch.Status.REGISTERED) {
            throw new IllegalStateException("Peserta sudah ATTENDED/PASSED/FAILED, tidak boleh dihapus.");
        }

        eb.setDeletedAt(Instant.now());
        eb.setUpdatedAt(Instant.now());
        repo.save(eb);
    }

    // ================== ELIGIBLE EMPLOYEES ==================
    @Transactional(readOnly = true)
    public List<EmployeeEligibilityResponse> getEligibleEmployeesForBatch(Long batchId) {
        Batch batch = batchRepo.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found"));
        Long certRuleId = batch.getCertificationRule().getId();

        List<EmployeeEligibility> eligibles = eligibilityRepo
                .findByCertificationRule_IdAndIsActiveTrueAndDeletedAtIsNull(certRuleId);

        List<Long> existingIds = repo.findByBatch_IdAndDeletedAtIsNull(batchId)
                .stream()
                .map(eb -> eb.getEmployee().getId())
                .toList();

        return eligibles.stream()
                .filter(e -> e.getEmployee() != null && !existingIds.contains(e.getEmployee().getId()))
                .map(this::toEligibilityResponse)
                .toList();
    }
}
