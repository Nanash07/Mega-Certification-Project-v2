// src/main/java/com/bankmega/certification/service/EmployeeCertificationService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeCertificationRequest;
import com.bankmega.certification.dto.EmployeeCertificationResponse;
import com.bankmega.certification.entity.CertificationRule;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.entity.EmployeeCertificationHistory.ActionType;
import com.bankmega.certification.entity.Institution;

import com.bankmega.certification.repository.CertificationRuleRepository;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import com.bankmega.certification.repository.EmployeeEligibilityRepository;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.InstitutionRepository;
import com.bankmega.certification.specification.EmployeeCertificationSpecification;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
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
    private final EmployeeEligibilityService eligibilityService;

    @PersistenceContext
    private EntityManager em;

    private static final int BATCH_SIZE = 500;
    private static final int IN_CHUNK = 800;

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

    private void assertRuleInScope(CertificationRule rule, List<Long> allowedCertIds) {
        if (allowedCertIds == null) {
            return;
        }
        if (rule == null || rule.getCertification() == null || rule.getCertification().getId() == null) {
            throw new RuntimeException("Certification not found");
        }
        Long certId = rule.getCertification().getId();
        if (allowedCertIds.isEmpty() || !allowedCertIds.contains(certId)) {
            throw new RuntimeException("Certification not found");
        }
    }

    private EmployeeCertification getByIdScoped(Long id, List<Long> allowedCertIds) {
        EmployeeCertification ec = repo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new RuntimeException("Certification not found"));
        assertRuleInScope(ec.getCertificationRule(), allowedCertIds);
        return ec;
    }

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
            repo.saveAll(Objects.requireNonNull(list.subList(i, end)));
            em.flush();
            em.clear();
        }
    }

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

    private void maybeResetCounters(EmployeeCertification ec) {
        if (ec != null
                && ec.getProcessType() == EmployeeCertification.ProcessType.SERTIFIKASI
                && ec.getCertDate() != null) {
            resetCountersFor(ec.getEmployee().getId(), ec.getCertificationRule().getId());
        }
    }

    private void refreshEligibilityFor(EmployeeCertification ec) {
        if (ec == null || ec.getEmployee() == null || ec.getEmployee().getId() == null)
            return;
        eligibilityService.refreshEligibilityForEmployee(ec.getEmployee().getId());
    }

    private void refreshEligibilityForEmployees(Collection<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return;
        employeeIds.stream()
                .filter(Objects::nonNull)
                .distinct()
                .forEach(eligibilityService::refreshEligibilityForEmployee);
    }

    @Transactional
    public EmployeeCertificationResponse create(EmployeeCertificationRequest req, List<Long> allowedCertIds) {
        Employee employee = employeeRepo.findById(Objects.requireNonNull(req.getEmployeeId()))
                .orElseThrow(() -> new RuntimeException("Employee not found"));

        CertificationRule rule = ruleRepo.findById(Objects.requireNonNull(req.getCertificationRuleId()))
                .orElseThrow(() -> new RuntimeException("Certification Rule not found"));

        assertRuleInScope(rule, allowedCertIds);

        Institution institution = (req.getInstitutionId() != null)
                ? institutionRepo.findById(Objects.requireNonNull(req.getInstitutionId())).orElse(null)
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
                .processType(req.getProcessType() != null
                        ? req.getProcessType()
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

        EmployeeCertification saved = repo.save(Objects.requireNonNull(ec));
        historyService.snapshot(saved, ActionType.CREATED);

        maybeResetCounters(saved);
        refreshEligibilityFor(saved);

        return toResponse(saved);
    }

    @Transactional
    public EmployeeCertificationResponse create(EmployeeCertificationRequest req) {
        return create(req, null);
    }

    @Transactional
    public EmployeeCertificationResponse update(Long id, EmployeeCertificationRequest req, List<Long> allowedCertIds) {
        EmployeeCertification ec = getByIdScoped(id, allowedCertIds);

        if (!hasChanged(ec, req)) {
            return toResponse(ec);
        }

        if (req.getCertificationRuleId() != null &&
                !Objects.equals(ec.getCertificationRule().getId(), req.getCertificationRuleId())) {
            CertificationRule rule = ruleRepo.findById(Objects.requireNonNull(req.getCertificationRuleId()))
                    .orElseThrow(() -> new RuntimeException("Certification Rule not found"));
            assertRuleInScope(rule, allowedCertIds);
            ec.setCertificationRule(rule);
            ec.setRuleValidityMonths(rule.getValidityMonths());
            ec.setRuleReminderMonths(rule.getReminderMonths());
        }

        if (req.getInstitutionId() != null) {
            Institution institution = institutionRepo.findById(Objects.requireNonNull(req.getInstitutionId()))
                    .orElse(null);
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
        refreshEligibilityFor(saved);

        return toResponse(saved);
    }

    @Transactional
    public EmployeeCertificationResponse update(Long id, EmployeeCertificationRequest req) {
        return update(id, req, null);
    }

    @Transactional
    public void softDelete(Long id, List<Long> allowedCertIds) {
        EmployeeCertification ec = getByIdScoped(id, allowedCertIds);

        ec.setDeletedAt(LocalDateTime.now());
        ec.setStatus(EmployeeCertification.Status.INVALID);
        ec.setUpdatedAt(Instant.now());

        EmployeeCertification saved = repo.save(ec);
        historyService.snapshot(saved, ActionType.DELETED);

        refreshEligibilityFor(saved);
    }

    @Transactional
    public void softDelete(Long id) {
        softDelete(id, null);
    }

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

        refreshEligibilityFor(saved);

        return saved;
    }

    @Transactional
    public EmployeeCertificationResponse uploadCertificate(Long id, MultipartFile file, List<Long> allowedCertIds) {
        EmployeeCertification ec = getByIdScoped(id, allowedCertIds);
        return toResponse(handleFileUpdate(ec, file, false, false, ActionType.UPLOAD_CERTIFICATE));
    }

    @Transactional
    public EmployeeCertificationResponse uploadCertificate(Long id, MultipartFile file) {
        return uploadCertificate(id, file, null);
    }

    @Transactional
    public EmployeeCertificationResponse reuploadCertificate(Long id, MultipartFile file, List<Long> allowedCertIds) {
        EmployeeCertification ec = getByIdScoped(id, allowedCertIds);
        return toResponse(handleFileUpdate(ec, file, true, false, ActionType.REUPLOAD_CERTIFICATE));
    }

    @Transactional
    public EmployeeCertificationResponse reuploadCertificate(Long id, MultipartFile file) {
        return reuploadCertificate(id, file, null);
    }

    @Transactional
    public void deleteCertificate(Long id, List<Long> allowedCertIds) {
        EmployeeCertification ec = getByIdScoped(id, allowedCertIds);
        handleFileUpdate(ec, null, false, true, ActionType.DELETE_CERTIFICATE);
    }

    @Transactional
    public void deleteCertificate(Long id) {
        deleteCertificate(id, null);
    }

    @Transactional(readOnly = true)
    public EmployeeCertificationResponse getDetail(Long id, List<Long> allowedCertIds) {
        return toResponse(getByIdScoped(id, allowedCertIds));
    }

    @Transactional(readOnly = true)
    public EmployeeCertificationResponse getDetail(Long id) {
        return getDetail(id, null);
    }

    @Transactional(readOnly = true)
    public void assertCanAccess(Long id, List<Long> allowedCertIds) {
        getByIdScoped(id, allowedCertIds);
    }

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
            List<Long> allowedCertIds,
            Pageable pageable) {

        Specification<EmployeeCertification> spec = buildFilteredSpec(
                employeeIds, certCodes, levels, subCodes, institutionIds, statuses, search,
                certDateStart, certDateEnd, validUntilStart, validUntilEnd,
                allowedCertIds);

        return repo.findAll(spec, Objects.requireNonNull(pageable)).map(this::toResponse);
    }

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

        return getPagedFiltered(
                employeeIds, certCodes, levels, subCodes, institutionIds, statuses, search,
                certDateStart, certDateEnd, validUntilStart, validUntilEnd,
                null,
                pageable);
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(
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
            List<Long> allowedCertIds) {

        Specification<EmployeeCertification> spec = buildFilteredSpec(
                employeeIds, certCodes, levels, subCodes, institutionIds, statuses, search,
                certDateStart, certDateEnd, validUntilStart, validUntilEnd,
                allowedCertIds);

        Sort sort = Sort.by(Sort.Order.desc("createdAt"));
        List<EmployeeCertification> rows = repo.findAll(spec, sort);
        List<EmployeeCertificationResponse> data = rows.stream().map(this::toResponse).toList();

        return buildCertificationExcel(data);
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(
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
            LocalDate validUntilEnd) {

        return exportExcel(
                employeeIds, certCodes, levels, subCodes, institutionIds, statuses, search,
                certDateStart, certDateEnd, validUntilStart, validUntilEnd,
                null);
    }

    private Specification<EmployeeCertification> buildFilteredSpec(
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
            List<Long> allowedCertIds) {

        return EmployeeCertificationSpecification.notDeleted()
                .and(EmployeeCertificationSpecification.byEmployeeIds(employeeIds))
                .and(EmployeeCertificationSpecification.byCertCodes(certCodes))
                .and(EmployeeCertificationSpecification.byLevels(levels))
                .and(EmployeeCertificationSpecification.bySubCodes(subCodes))
                .and(EmployeeCertificationSpecification.byInstitutionIds(institutionIds))
                .and(EmployeeCertificationSpecification.byStatuses(statuses))
                .and(EmployeeCertificationSpecification.bySearch(search))
                .and(EmployeeCertificationSpecification.byCertDateRange(certDateStart, certDateEnd))
                .and(EmployeeCertificationSpecification.byValidUntilRange(validUntilStart, validUntilEnd))
                .and(EmployeeCertificationSpecification.byAllowedCertificationIds(allowedCertIds));
    }

    private byte[] buildCertificationExcel(List<EmployeeCertificationResponse> data) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sh = wb.createSheet("Employee Certifications");

            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            CellStyle dateStyle = wb.createCellStyle();
            CreationHelper ch = wb.getCreationHelper();
            dateStyle.setDataFormat(ch.createDataFormat().getFormat("dd-mmm-yyyy"));

            String[] headers = new String[] {
                    "NIP", "Nama Pegawai", "Jabatan",
                    "Status",
                    "Cert Code", "Jenjang", "Sub Bidang",
                    "No Sertifikat", "Tanggal Sertifikat",
                    "Valid From", "Tanggal Kadaluarsa", "Reminder",
                    "Lembaga",
                    "File Name", "File Type"
            };

            Row hr = sh.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell c = hr.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(headerStyle);
            }

            int r = 1;
            for (EmployeeCertificationResponse e : data) {
                Row row = sh.createRow(r++);
                int col = 0;

                row.createCell(col++).setCellValue(nz(e.getNip()));
                row.createCell(col++).setCellValue(nz(e.getEmployeeName()));
                row.createCell(col++).setCellValue(nz(e.getJobPositionTitle()));

                row.createCell(col++).setCellValue(nz(e.getStatus() != null ? e.getStatus().name() : null));

                row.createCell(col++).setCellValue(nz(e.getCertificationCode()));
                row.createCell(col++)
                        .setCellValue(e.getCertificationLevelLevel() != null ? e.getCertificationLevelLevel() : 0);
                row.createCell(col++).setCellValue(nz(e.getSubFieldCode()));

                row.createCell(col++).setCellValue(nz(e.getCertNumber()));
                setDateCell(row, col++, e.getCertDate(), dateStyle);

                setDateCell(row, col++, e.getValidFrom(), dateStyle);
                setDateCell(row, col++, e.getValidUntil(), dateStyle);
                setDateCell(row, col++, e.getReminderDate(), dateStyle);

                row.createCell(col++).setCellValue(nz(e.getInstitutionName()));
                row.createCell(col++).setCellValue(nz(e.getFileName()));
                row.createCell(col++).setCellValue(nz(e.getFileType()));
            }

            for (int i = 0; i < headers.length; i++) {
                sh.autoSizeColumn(i);
            }

            wb.write(out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to export excel", ex);
        }
    }

    private static String nz(String s) {
        return s == null ? "" : s;
    }

    private static void setDateCell(Row row, int col, LocalDate date, CellStyle dateStyle) {
        Cell c = row.createCell(col);
        if (date == null)
            return;
        c.setCellValue(java.sql.Date.valueOf(date));
        c.setCellStyle(dateStyle);
    }

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

            refreshEligibilityForEmployees(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

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

            refreshEligibilityForEmployees(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

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

            refreshEligibilityForEmployees(
                    changed.stream()
                            .map(c -> c.getEmployee().getId())
                            .collect(Collectors.toSet()));
        }
        return total;
    }

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
            refreshEligibilityFor(changed.get(0));
        }

        return changed.size();
    }

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
