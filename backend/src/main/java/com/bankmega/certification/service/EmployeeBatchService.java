// src/main/java/com/bankmega/certification/service/EmployeeBatchService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeBatchResponse;
import com.bankmega.certification.dto.EmployeeEligibilityResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeBatchSpecification;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeBatchService {

    private final EmployeeBatchRepository repo;
    private final BatchRepository batchRepo;
    private final EmployeeRepository employeeRepo;
    private final EmployeeEligibilityRepository eligibilityRepo;
    private final EmployeeCertificationRepository certificationRepo;
    private final EmployeeCertificationHistoryService historyService;

    @PersistenceContext
    private EntityManager em;

    private static final int ADD_CHUNK = 10;

    // ================== MAPPER ==================
    private EmployeeBatchResponse toResponse(EmployeeBatch eb) {
        Employee emp = eb.getEmployee();

        JobPosition jp = (emp != null) ? emp.getJobPosition() : null;
        Division div = (emp != null) ? emp.getDivision() : null;
        Regional reg = (emp != null) ? emp.getRegional() : null;
        Unit unit = (emp != null) ? emp.getUnit() : null;

        return EmployeeBatchResponse.builder()
                .id(eb.getId())
                .employeeId(emp != null ? emp.getId() : null)
                .employeeNip(emp != null ? emp.getNip() : null)
                .employeeName(emp != null ? emp.getName() : null)

                // struktur org
                .employeeJobName(jp != null ? jp.getName() : null)
                .employeeDivisionName(div != null ? div.getName() : null)
                .employeeRegionalName(reg != null ? reg.getName() : null)
                .employeeUnitName(unit != null ? unit.getName() : null)

                .batchId(eb.getBatch() != null ? eb.getBatch().getId() : null)
                .batchName(eb.getBatch() != null ? eb.getBatch().getBatchName() : null)
                .status(eb.getStatus())
                .processType(eb.getProcessType()) // ⬅️ dikembalikan
                .registrationDate(eb.getRegistrationDate())
                .attendedAt(eb.getAttendedAt())
                .resultDate(eb.getResultDate())
                .score(eb.getScore()) // ⬅️ dikembalikan
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
        Specification<EmployeeBatch> spec = EmployeeBatchSpecification.notDeleted()
                .and(EmployeeBatchSpecification.byBatch(batchId))
                .and(EmployeeBatchSpecification.withOrgFetch());

        return repo.findAll(spec, Sort.by(Sort.Order.asc("employee.nip")))
                .stream().map(this::toResponse).toList();
    }

    // ================== SEARCH + PAGING ==================
    @Transactional(readOnly = true)
    public Page<EmployeeBatchResponse> search(
            Long batchId,
            String search,
            EmployeeBatch.Status status,
            String regional,
            String division,
            String unit,
            String job,
            Pageable pageable) {

        Specification<EmployeeBatch> spec = EmployeeBatchSpecification.notDeleted()
                .and(EmployeeBatchSpecification.byBatch(batchId))
                .and(EmployeeBatchSpecification.byStatus(status))
                .and(EmployeeBatchSpecification.bySearch(search))
                .and(EmployeeBatchSpecification.byRegionalName(regional))
                .and(EmployeeBatchSpecification.byDivisionName(division))
                .and(EmployeeBatchSpecification.byUnitName(unit))
                .and(EmployeeBatchSpecification.byJobName(job))
                .and(EmployeeBatchSpecification.withOrgFetch());

        if (pageable.getSort().isUnsorted()) {
            pageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                    Sort.by(Sort.Order.asc("employee.nip")));
        }
        return repo.findAll(spec, pageable).map(this::toResponse);
    }

    // ================== ADD SINGLE (restore if soft-deleted) ==================
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

        // Gate check
        assertAllowedToJoin(batch, emp);

        return repo.findByBatch_IdAndEmployee_Id(batchId, employeeId)
                .map(eb -> {
                    if (eb.getDeletedAt() == null) {
                        throw new IllegalStateException("Peserta sudah ada di batch ini");
                    }
                    eb.setDeletedAt(null);
                    eb.setStatus(EmployeeBatch.Status.REGISTERED);
                    if (eb.getProcessType() == null) {
                        eb.setProcessType(mapProcessType(batch.getType())); // snapshot
                    }
                    eb.setRegistrationDate(LocalDate.now());
                    eb.setUpdatedAt(Instant.now());
                    return toResponse(repo.save(eb));
                })
                .orElseGet(() -> {
                    EmployeeBatch eb = EmployeeBatch.builder()
                            .batch(batch)
                            .employee(emp)
                            .status(EmployeeBatch.Status.REGISTERED)
                            .processType(mapProcessType(batch.getType())) // snapshot
                            .registrationDate(LocalDate.now())
                            .createdAt(Instant.now())
                            .updatedAt(Instant.now())
                            .build();
                    return toResponse(repo.save(eb));
                });
    }

    // ================== ADD BULK (chunk 10 + prefetch) ==================
    @Transactional
    public List<EmployeeBatchResponse> addParticipantsBulk(Long batchId, List<Long> employeeIds) {
        Batch batch = batchRepo.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found"));

        long currentCount = repo.countByBatch_IdAndDeletedAtIsNull(batchId);
        Integer quota = batch.getQuota();
        int remaining = quota == null ? Integer.MAX_VALUE : Math.max(0, quota - (int) currentCount);

        List<Long> ids = employeeIds == null ? List.of()
                : employeeIds.stream().filter(Objects::nonNull).distinct().toList();

        if (ids.isEmpty() || remaining <= 0)
            return List.of();

        final Long ruleId = batch.getCertificationRule().getId();
        final EmployeeBatch.ProcessType pt = mapProcessType(batch.getType());

        List<EmployeeBatchResponse> responses = new ArrayList<>();
        int added = 0;

        for (List<Long> part : partition(ids, ADD_CHUNK)) {
            if (added >= remaining)
                break;

            List<Long> chunk = part;
            if (quota != null && added + chunk.size() > remaining) {
                chunk = chunk.subList(0, Math.max(0, remaining - added));
            }
            if (chunk.isEmpty())
                break;

            // Prefetch
            Map<Long, Employee> employees = employeeRepo
                    .findByIdInAndDeletedAtIsNull(chunk).stream()
                    .collect(Collectors.toMap(Employee::getId, e -> e));

            Map<Long, EmployeeBatch> existingByEmpId = repo
                    .findByBatch_IdAndEmployee_IdIn(batchId, chunk).stream()
                    .collect(Collectors.toMap(eb -> eb.getEmployee().getId(), eb -> eb));

            Map<Long, EmployeeEligibility> eligByEmpId = eligibilityRepo
                    .findByEmployee_IdInAndCertificationRule_IdAndDeletedAtIsNull(chunk, ruleId).stream()
                    .collect(Collectors.toMap(e -> e.getEmployee().getId(), e -> e));

            Set<Long> hasCert = certificationRepo
                    .findByEmployeeIdInAndDeletedAtIsNull(chunk).stream()
                    .filter(c -> c.getCertificationRule() != null
                            && Objects.equals(c.getCertificationRule().getId(), ruleId))
                    .map(c -> c.getEmployee().getId())
                    .collect(Collectors.toSet());

            List<EmployeeBatch> toSave = new ArrayList<>(chunk.size());
            Instant now = Instant.now();
            LocalDate today = LocalDate.now();

            for (Long empId : chunk) {
                Employee emp = employees.get(empId);
                if (emp == null)
                    continue;

                // Gate (tanpa query lagi)
                EmployeeEligibility ee = eligByEmpId.get(empId);
                if (ee == null || !Boolean.TRUE.equals(ee.getIsActive())) {
                    throw new IllegalStateException("Pegawai " + (emp.getNip() != null ? emp.getNip() : empId)
                            + " tidak eligible untuk rule ini.");
                }
                int t = ee.getTrainingCount() == null ? 0 : ee.getTrainingCount();
                int r = ee.getRefreshmentCount() == null ? 0 : ee.getRefreshmentCount();
                boolean alreadyCert = hasCert.contains(empId);

                switch (batch.getType()) {
                    case TRAINING -> {
                        /* semua eligible boleh */ }
                    case REFRESHMENT -> {
                        if (!alreadyCert) {
                            throw new IllegalStateException("Syarat refreshment: harus sudah memiliki sertifikat.");
                        }
                    }
                    case CERTIFICATION -> {
                        if (!alreadyCert && t < 1) {
                            throw new IllegalStateException(
                                    "Sertifikasi pertama: minimal training 1x di siklus berjalan.");
                        }
                        if (alreadyCert && (t < 1 && r < 1)) {
                            throw new IllegalStateException(
                                    "Sertifikasi ulang: minimal training ATAU refreshment di siklus berjalan.");
                        }
                    }
                }

                EmployeeBatch eb = existingByEmpId.get(empId);
                if (eb != null) {
                    if (eb.getDeletedAt() == null)
                        continue; // sudah aktif
                    eb.setDeletedAt(null);
                    eb.setStatus(EmployeeBatch.Status.REGISTERED);
                    if (eb.getProcessType() == null)
                        eb.setProcessType(pt);
                    eb.setRegistrationDate(today);
                    eb.setUpdatedAt(now);
                    toSave.add(eb);
                } else {
                    eb = EmployeeBatch.builder()
                            .batch(batch)
                            .employee(emp)
                            .status(EmployeeBatch.Status.REGISTERED)
                            .processType(pt)
                            .registrationDate(today)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
                    toSave.add(eb);
                }
            }

            if (!toSave.isEmpty()) {
                repo.saveAll(toSave);
                em.flush();
                em.clear();
                toSave.forEach(eb -> responses.add(toResponse(eb)));
                added += toSave.size();
            }
        }

        return responses;
    }

    // ================== UPDATE STATUS (lock PASSED + efek) ==================
    @Transactional
    public EmployeeBatchResponse updateStatus(Long id, EmployeeBatch.Status status, Integer score, String notes) {
        EmployeeBatch eb = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("EmployeeBatch not found"));

        EmployeeBatch.Status current = eb.getStatus();
        if (current == EmployeeBatch.Status.PASSED) {
            throw new IllegalStateException("Peserta sudah PASSED dan tidak dapat diubah lagi.");
        }
        if (status == EmployeeBatch.Status.ATTENDED && current != EmployeeBatch.Status.REGISTERED) {
            throw new IllegalStateException("Hanya peserta REGISTERED yang bisa jadi ATTENDED");
        }
        if ((status == EmployeeBatch.Status.PASSED || status == EmployeeBatch.Status.FAILED)
                && current != EmployeeBatch.Status.ATTENDED) {
            throw new IllegalStateException("Peserta harus ATTENDED dulu sebelum PASSED/FAILED");
        }

        // defensive: re-check gate saat attend
        if (status == EmployeeBatch.Status.ATTENDED) {
            assertAllowedToJoin(eb.getBatch(), eb.getEmployee());
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

        // Efek ketika lulus
        if (status == EmployeeBatch.Status.PASSED) {
            EmployeeBatch.ProcessType pt = saved.getProcessType() != null
                    ? saved.getProcessType()
                    : mapProcessType(saved.getBatch().getType());

            switch (pt) {
                case TRAINING -> incrementTraining(saved);
                case REFRESHMENT -> incrementRefreshment(saved);
                case CERTIFICATION -> {
                    createOrUpdateCertification(saved);
                    resetCounters(saved);
                }
            }
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
        eb.setUpdatedAt(Instant.now());

        return toResponse(repo.save(eb));
    }

    // ================== CERT CREATOR (untuk CERTIFICATION) ==================
    private void createOrUpdateCertification(EmployeeBatch eb) {
        Employee emp = eb.getEmployee();
        CertificationRule rule = eb.getBatch().getCertificationRule();
        Institution institution = eb.getBatch().getInstitution();

        EmployeeCertification ec = certificationRepo
                .findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(emp.getId(), rule.getId())
                .orElse(null);

        boolean isNew = false;
        LocalDate passDate = eb.getResultDate() != null ? eb.getResultDate() : LocalDate.now();

        if (ec == null) {
            ec = EmployeeCertification.builder()
                    .employee(emp)
                    .certificationRule(rule)
                    .institution(institution)
                    .certDate(passDate)
                    .processType(EmployeeCertification.ProcessType.SERTIFIKASI)
                    .status(EmployeeCertification.Status.PENDING)
                    .ruleValidityMonths(rule != null ? rule.getValidityMonths() : null)
                    .ruleReminderMonths(rule != null ? rule.getReminderMonths() : null)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            isNew = true;
        } else {
            ec.setCertDate(passDate);
            ec.setProcessType(EmployeeCertification.ProcessType.SERTIFIKASI);
            ec.setUpdatedAt(Instant.now());
            ec.setStatus((ec.getCertNumber() == null || ec.getCertNumber().isBlank())
                    ? EmployeeCertification.Status.PENDING
                    : EmployeeCertification.Status.ACTIVE);

            if (ec.getRuleValidityMonths() == null && rule != null) {
                ec.setRuleValidityMonths(rule.getValidityMonths());
            }
            if (ec.getRuleReminderMonths() == null && rule != null) {
                ec.setRuleReminderMonths(rule.getReminderMonths());
            }
        }

        if (ec.getCertDate() != null) {
            ec.setValidFrom(ec.getCertDate());
            Integer v = ec.getRuleValidityMonths() != null ? ec.getRuleValidityMonths()
                    : (rule != null ? rule.getValidityMonths() : null);
            Integer r = ec.getRuleReminderMonths() != null ? ec.getRuleReminderMonths()
                    : (rule != null ? rule.getReminderMonths() : null);

            if (v != null) {
                ec.setValidUntil(ec.getCertDate().plusMonths(v));
            } else {
                ec.setValidUntil(null);
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

    // ================== COUNTERS ==================
    private void incrementTraining(EmployeeBatch eb) {
        EmployeeEligibility ee = getActiveEligibilityOrThrow(eb.getEmployee(), eb.getBatch().getCertificationRule());
        ee.setTrainingCount((ee.getTrainingCount() == null ? 0 : ee.getTrainingCount()) + 1);
        ee.setUpdatedAt(Instant.now());
        eligibilityRepo.save(ee);
    }

    private void incrementRefreshment(EmployeeBatch eb) {
        EmployeeEligibility ee = getActiveEligibilityOrThrow(eb.getEmployee(), eb.getBatch().getCertificationRule());
        ee.setRefreshmentCount((ee.getRefreshmentCount() == null ? 0 : ee.getRefreshmentCount()) + 1);
        ee.setUpdatedAt(Instant.now());
        eligibilityRepo.save(ee);
    }

    private void resetCounters(EmployeeBatch eb) {
        EmployeeEligibility ee = getActiveEligibilityOrThrow(eb.getEmployee(), eb.getBatch().getCertificationRule());
        ee.setTrainingCount(0);
        ee.setRefreshmentCount(0);
        ee.setUpdatedAt(Instant.now());
        eligibilityRepo.save(ee);
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

    // ================== ELIGIBLE (apply gate sesuai tipe batch) ==================
    @Transactional(readOnly = true)
    public List<EmployeeEligibilityResponse> getEligibleEmployeesForBatch(Long batchId) {
        Batch batch = batchRepo.findByIdAndDeletedAtIsNull(batchId)
                .orElseThrow(() -> new NotFoundException("Batch not found"));
        Long ruleId = batch.getCertificationRule().getId();

        List<EmployeeEligibility> eligibles = eligibilityRepo
                .findByCertificationRule_IdAndIsActiveTrueAndDeletedAtIsNull(ruleId);

        Set<Long> existingIds = repo.findByBatch_IdAndDeletedAtIsNull(batchId).stream()
                .map(eb -> eb.getEmployee().getId()).collect(Collectors.toSet());

        List<Long> empIds = eligibles.stream().map(e -> e.getEmployee().getId()).toList();
        Set<Long> hasCertEmpIds = certificationRepo.findByEmployeeIdInAndDeletedAtIsNull(empIds).stream()
                .filter(c -> c.getCertificationRule() != null
                        && Objects.equals(c.getCertificationRule().getId(), ruleId))
                .map(c -> c.getEmployee().getId())
                .collect(Collectors.toSet());

        return eligibles.stream()
                .filter(e -> e.getEmployee() != null && !existingIds.contains(e.getEmployee().getId()))
                .filter(e -> switch (batch.getType()) {
                    case TRAINING -> true;
                    case REFRESHMENT -> hasCertEmpIds.contains(e.getEmployee().getId());
                    case CERTIFICATION -> {
                        boolean hasCert = hasCertEmpIds.contains(e.getEmployee().getId());
                        int t = e.getTrainingCount() == null ? 0 : e.getTrainingCount();
                        int r = e.getRefreshmentCount() == null ? 0 : e.getRefreshmentCount();
                        yield hasCert ? (t >= 1 || r >= 1) : (t >= 1);
                    }
                })
                .map(this::toEligibilityResponse)
                .toList();
    }

    // ================== HELPERS ==================
    private EmployeeBatch.ProcessType mapProcessType(Batch.BatchType type) {
        return switch (type) {
            case CERTIFICATION -> EmployeeBatch.ProcessType.CERTIFICATION;
            case TRAINING -> EmployeeBatch.ProcessType.TRAINING;
            case REFRESHMENT -> EmployeeBatch.ProcessType.REFRESHMENT;
        };
    }

    private void assertAllowedToJoin(Batch batch, Employee emp) {
        Long ruleId = batch.getCertificationRule().getId();
        EmployeeEligibility ee = getActiveEligibilityOrThrow(emp, batch.getCertificationRule());
        boolean hasCert = hasCertification(emp.getId(), ruleId);
        int t = ee.getTrainingCount() == null ? 0 : ee.getTrainingCount();
        int r = ee.getRefreshmentCount() == null ? 0 : ee.getRefreshmentCount();

        switch (batch.getType()) {
            case TRAINING -> {
                /* semua eligible boleh */ }
            case REFRESHMENT -> {
                if (!hasCert)
                    throw new IllegalStateException(
                            "Syarat ikut refreshment: pegawai harus sudah memiliki sertifikat untuk rule ini.");
            }
            case CERTIFICATION -> {
                if (!hasCert && t < 1) {
                    throw new IllegalStateException(
                            "Syarat sertifikasi pertama: minimal sudah training 1x di siklus berjalan.");
                }
                if (hasCert && (t < 1 && r < 1)) {
                    throw new IllegalStateException(
                            "Syarat sertifikasi ulang: minimal sudah training ATAU refreshment di siklus berjalan.");
                }
            }
        }
    }

    private boolean hasCertification(Long employeeId, Long ruleId) {
        return certificationRepo
                .findFirstByEmployeeIdAndCertificationRuleIdAndDeletedAtIsNull(employeeId, ruleId)
                .isPresent();
    }

    private EmployeeEligibility getActiveEligibilityOrThrow(Employee employee, CertificationRule rule) {
        return eligibilityRepo
                .findByEmployee_IdAndCertificationRule_IdAndDeletedAtIsNull(employee.getId(), rule.getId())
                .filter(EmployeeEligibility::getIsActive)
                .orElseThrow(() -> new IllegalStateException("Pegawai tidak eligible untuk rule ini."));
    }

    private static <T> List<List<T>> partition(List<T> src, int size) {
        if (src == null || src.isEmpty())
            return List.of();
        int n = src.size();
        List<List<T>> out = new ArrayList<>((n + size - 1) / size);
        for (int i = 0; i < n; i += size) {
            out.add(src.subList(i, Math.min(i + size, n)));
        }
        return out;
    }
}
