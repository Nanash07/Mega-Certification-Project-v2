// src/main/java/com/bankmega/certification/service/EmployeeService.java
package com.bankmega.certification.service;

import com.bankmega.certification.dto.EmployeeRequest;
import com.bankmega.certification.dto.EmployeeResponse;
import com.bankmega.certification.entity.*;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.*;
import com.bankmega.certification.specification.EmployeeSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class EmployeeService {

        private final EmployeeRepository repo;
        private final EmployeePositionRepository positionRepo;
        private final RegionalRepository regionalRepo;
        private final DivisionRepository divisionRepo;
        private final UnitRepository unitRepo;
        private final JobPositionRepository jobPositionRepo;
        private final EmployeeHistoryService historyService;

        @Transactional(readOnly = true)
        public List<EmployeeResponse> getAllActive() {
                return repo.findWithRelationsByStatusIgnoreCaseNotAndDeletedAtIsNull("RESIGN").stream()
                                .map(this::toResponse)
                                .toList();
        }

        @Transactional(readOnly = true)
        public Page<EmployeeResponse> search(
                        List<Long> employeeIds,
                        List<Long> regionalIds,
                        List<Long> divisionIds,
                        List<Long> unitIds,
                        List<Long> jobPositionIds,
                        List<String> statuses,
                        String search,
                        String positionType, // NEW
                        Pageable pageable) {

                Specification<Employee> spec = EmployeeSpecification.activePageOnly()
                                .and(EmployeeSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeSpecification.byRegionalIds(regionalIds))
                                .and(EmployeeSpecification.byDivisionIds(divisionIds))
                                .and(EmployeeSpecification.byUnitIds(unitIds))
                                .and(EmployeeSpecification.byJobPositionIds(jobPositionIds))
                                .and(EmployeeSpecification.byStatuses(statuses))
                                .and(EmployeeSpecification.bySearch(search))
                                .and(EmployeeSpecification.byPositionType(positionType)); // NEW

                if (pageable.getSort().isUnsorted()) {
                        pageable = PageRequest.of(
                                        pageable.getPageNumber(),
                                        pageable.getPageSize(),
                                        Sort.by(Sort.Order.asc("nip")));
                }

                return repo.findAll(spec, pageable).map(this::toResponse);
        }

        @Transactional(readOnly = true)
        public Page<EmployeeResponse> searchResigned(
                        List<Long> employeeIds,
                        List<Long> regionalIds,
                        List<Long> divisionIds,
                        List<Long> unitIds,
                        List<Long> jobPositionIds,
                        String search,
                        String positionType, // NEW
                        Pageable pageable) {

                Specification<Employee> spec = EmployeeSpecification.resignedPageOnly()
                                .and(EmployeeSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeSpecification.byRegionalIds(regionalIds))
                                .and(EmployeeSpecification.byDivisionIds(divisionIds))
                                .and(EmployeeSpecification.byUnitIds(unitIds))
                                .and(EmployeeSpecification.byJobPositionIds(jobPositionIds))
                                .and(EmployeeSpecification.bySearch(search))
                                .and(EmployeeSpecification.byPositionType(positionType)); // NEW

                if (pageable.getSort().isUnsorted()) {
                        pageable = PageRequest.of(
                                        pageable.getPageNumber(),
                                        pageable.getPageSize(),
                                        Sort.by(Sort.Order.asc("nip")));
                }

                return repo.findAll(spec, pageable).map(this::toResponse);
        }

        @Transactional(readOnly = true)
        public long countActive(Long regionalId, Long divisionId, Long unitId) {
                Specification<Employee> spec = EmployeeSpecification.activePageOnly()
                                .and(EmployeeSpecification.byRegionalId(regionalId))
                                .and(EmployeeSpecification.byDivisionId(divisionId))
                                .and(EmployeeSpecification.byUnitId(unitId));

                return repo.count(spec);
        }

        @Transactional(readOnly = true)
        public EmployeeResponse getById(Long id) {
                Employee emp = repo.findByIdWithPositions(Objects.requireNonNull(id))
                                .orElseThrow(() -> new NotFoundException("Employee not found with id " + id));
                return toResponse(emp);
        }

        @Transactional
        public EmployeeResponse create(EmployeeRequest req) {
                if (repo.existsByNipIgnoreCaseAndDeletedAtIsNull(req.getNip())) {
                        throw new ConflictException("NIP " + req.getNip() + " is already used");
                }

                Employee emp = mapRequestToEntity(new Employee(), req);
                emp.setCreatedAt(Instant.now());
                emp.setUpdatedAt(Instant.now());
                emp.setDeletedAt(null);

                Employee saved = repo.save(emp);

                // Sync to positions table
                syncPrimaryPosition(saved, req);
                EmployeePosition primary = positionRepo.findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(
                                saved.getId(), EmployeePosition.PositionType.PRIMARY).orElse(null);
                LocalDate effDate = primary != null ? primary.getEffectiveDate() : null;

                historyService.snapshotCreated(saved, primary, effDate, "UTAMA");

                return toResponse(saved);
        }

        @Transactional
        public EmployeeResponse update(Long id, EmployeeRequest req) {
                Employee emp = repo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new NotFoundException("Employee not found with id " + id));

                if (!emp.getNip().equalsIgnoreCase(req.getNip())
                                && repo.existsByNipIgnoreCaseAndDeletedAtIsNull(req.getNip())) {
                        throw new ConflictException("NIP " + req.getNip() + " is already used");
                }

                if (!hasChanged(emp, req)) {
                        return toResponse(emp);
                }

                // Capture old values from primary position first
                EmployeePosition oldPrimary = emp.getPrimaryPosition();
                String oldJobTitle = oldPrimary != null && oldPrimary.getJobPosition() != null
                                ? oldPrimary.getJobPosition().getName()
                                : null;
                String oldUnitName = oldPrimary != null && oldPrimary.getUnit() != null
                                ? oldPrimary.getUnit().getName()
                                : null;
                String oldDivisionName = oldPrimary != null && oldPrimary.getDivision() != null
                                ? oldPrimary.getDivision().getName()
                                : null;
                String oldRegionalName = oldPrimary != null && oldPrimary.getRegional() != null
                                ? oldPrimary.getRegional().getName()
                                : null;

                emp = mapRequestToEntity(emp, req);
                emp.setUpdatedAt(Instant.now());

                Employee saved = repo.save(emp);

                // Sync to positions table
                syncPrimaryPosition(saved, req);
                EmployeePosition newPrimary = positionRepo.findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(
                                saved.getId(), EmployeePosition.PositionType.PRIMARY).orElse(null);
                LocalDate newEffDate = newPrimary != null ? newPrimary.getEffectiveDate() : null;

                EmployeeHistory.EmployeeActionType type = EmployeeHistory.EmployeeActionType.UPDATED;

                historyService.snapshotWithOldValues(
                                saved,
                                oldJobTitle,
                                oldUnitName,
                                oldDivisionName,
                                oldRegionalName,
                                type,
                                newEffDate,
                                "UTAMA");

                return toResponse(saved);
        }

        @Transactional
        public EmployeeResponse resign(Long id) {
                Employee emp = repo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new NotFoundException("Employee not found with id " + id));

                if (!"RESIGN".equalsIgnoreCase(emp.getStatus())) {
                        emp.setStatus("RESIGN");
                        emp.setUpdatedAt(Instant.now());
                        Employee saved = repo.save(emp);

                        // Deactivate all positions
                        List<EmployeePosition> positions = positionRepo.findByEmployeeIdAndDeletedAtIsNull(emp.getId());
                        positions.forEach(p -> {
                                p.setIsActive(false);
                                p.setUpdatedAt(Instant.now());
                        });
                        positionRepo.saveAll(positions);

                        EmployeePosition primary = emp.getPrimaryPosition();
                        LocalDate effDate = primary != null ? primary.getEffectiveDate() : null;

                        historyService.snapshot(saved, EmployeeHistory.EmployeeActionType.DELETED, effDate, "UTAMA");
                        return toResponse(saved);
                }

                return toResponse(emp);
        }

        @Transactional
        public void softDelete(Long id) {
                Employee emp = repo.findByIdAndDeletedAtIsNull(id)
                                .orElseThrow(() -> new NotFoundException("Employee not found with id " + id));

                emp.setStatus("TERMINATED");
                emp.setDeletedAt(Instant.now());
                emp.setUpdatedAt(Instant.now());

                Employee saved = repo.save(emp);

                // Soft delete all positions
                List<EmployeePosition> positions = positionRepo.findByEmployeeIdAndDeletedAtIsNull(emp.getId());
                positions.forEach(p -> {
                        p.setDeletedAt(Instant.now());
                        p.setUpdatedAt(Instant.now());
                });
                positionRepo.saveAll(positions);

                EmployeePosition primary = emp.getPrimaryPosition();
                LocalDate effDate = primary != null ? primary.getEffectiveDate() : null;

                historyService.snapshot(saved, EmployeeHistory.EmployeeActionType.DELETED, effDate, "UTAMA");
        }

        private Employee mapRequestToEntity(Employee emp, EmployeeRequest req) {
                // Legacy fields are removed.
                // Regional, Division, Unit, JobPosition are now ONLY handled in
                // employee_positions table via syncPrimaryPosition.
                // We only map core employee data here.

                emp.setNip(req.getNip());
                emp.setName(req.getName());
                emp.setEmail(req.getEmail());
                emp.setGender(req.getGender());
                emp.setStatus(req.getStatus());

                // Effective date is needed for snapshot history but not stored in legacy col
                // anymore?
                // Wait, history snapshot uses primary position now.
                // So we don't need to set it on emp.

                return emp;
        }

        private void syncPrimaryPosition(Employee emp, EmployeeRequest req) {
                Regional reg = regionalRepo.findById(Objects.requireNonNull(req.getRegionalId()))
                                .orElseThrow(() -> new NotFoundException("Regional not found: " + req.getRegionalId()));
                Division div = divisionRepo.findById(Objects.requireNonNull(req.getDivisionId()))
                                .orElseThrow(() -> new NotFoundException("Division not found: " + req.getDivisionId()));
                Unit unit = unitRepo.findById(Objects.requireNonNull(req.getUnitId()))
                                .orElseThrow(() -> new NotFoundException("Unit not found: " + req.getUnitId()));
                JobPosition job = jobPositionRepo.findById(Objects.requireNonNull(req.getJobPositionId()))
                                .orElseThrow(() -> new NotFoundException(
                                                "JobPosition not found: " + req.getJobPositionId()));

                EmployeePosition primary = positionRepo.findByEmployeeIdAndPositionTypeAndDeletedAtIsNull(
                                emp.getId(), EmployeePosition.PositionType.PRIMARY).orElse(null);

                Instant now = Instant.now();
                if (primary == null) {
                        primary = EmployeePosition.builder()
                                        .employee(emp)
                                        .positionType(EmployeePosition.PositionType.PRIMARY)
                                        .createdAt(now)
                                        .build();
                }

                primary.setRegional(reg);
                primary.setDivision(div);
                primary.setUnit(unit);
                primary.setJobPosition(job);
                primary.setEffectiveDate(req.getEffectiveDate());
                primary.setIsActive(true);
                primary.setUpdatedAt(now);
                positionRepo.save(primary);
        }

        private boolean hasChanged(Employee emp, EmployeeRequest req) {
                EmployeePosition primary = emp.getPrimaryPosition();

                Long currentRegionalId = primary != null && primary.getRegional() != null
                                ? primary.getRegional().getId()
                                : null;
                Long currentDivisionId = primary != null && primary.getDivision() != null
                                ? primary.getDivision().getId()
                                : null;
                Long currentUnitId = primary != null && primary.getUnit() != null ? primary.getUnit().getId() : null;
                Long currentJobId = primary != null && primary.getJobPosition() != null
                                ? primary.getJobPosition().getId()
                                : null;
                LocalDate currentEffDate = primary != null ? primary.getEffectiveDate() : null;

                return !Objects.equals(emp.getName(), req.getName())
                                || !Objects.equals(emp.getEmail(), req.getEmail())
                                || !Objects.equals(emp.getGender(), req.getGender())
                                || !Objects.equals(emp.getStatus(), req.getStatus())
                                || !Objects.equals(currentEffDate, req.getEffectiveDate())
                                || !Objects.equals(currentRegionalId, req.getRegionalId())
                                || !Objects.equals(currentDivisionId, req.getDivisionId())
                                || !Objects.equals(currentUnitId, req.getUnitId())
                                || !Objects.equals(currentJobId, req.getJobPositionId());
        }

        private EmployeeResponse toResponse(Employee e) {
                EmployeePosition primary = e.getPrimaryPosition();
                EmployeePosition secondary = e.getSecondaryPosition();

                return EmployeeResponse.builder()
                                .id(e.getId())
                                .nip(e.getNip())
                                .name(e.getName())
                                .email(e.getEmail())
                                .gender(e.getGender())
                                .regionalId(primary != null && primary.getRegional() != null
                                                ? primary.getRegional().getId()
                                                : null)
                                .regionalName(primary != null && primary.getRegional() != null
                                                ? primary.getRegional().getName()
                                                : null)
                                .divisionId(primary != null && primary.getDivision() != null
                                                ? primary.getDivision().getId()
                                                : null)
                                .divisionName(primary != null && primary.getDivision() != null
                                                ? primary.getDivision().getName()
                                                : null)
                                .unitId(primary != null && primary.getUnit() != null ? primary.getUnit().getId()
                                                : null)
                                .unitName(primary != null && primary.getUnit() != null ? primary.getUnit().getName()
                                                : null)
                                .jobPositionId(primary != null && primary.getJobPosition() != null
                                                ? primary.getJobPosition().getId()
                                                : null)
                                .jobName(primary != null && primary.getJobPosition() != null
                                                ? primary.getJobPosition().getName()
                                                : null)
                                .effectiveDate(primary != null ? primary.getEffectiveDate() : null)
                                .status(e.getStatus())
                                .regionalId2(secondary != null && secondary.getRegional() != null
                                                ? secondary.getRegional().getId()
                                                : null)
                                .regionalName2(secondary != null && secondary.getRegional() != null
                                                ? secondary.getRegional().getName()
                                                : null)
                                .divisionId2(secondary != null && secondary.getDivision() != null
                                                ? secondary.getDivision().getId()
                                                : null)
                                .divisionName2(secondary != null && secondary.getDivision() != null
                                                ? secondary.getDivision().getName()
                                                : null)
                                .unitId2(secondary != null && secondary.getUnit() != null ? secondary.getUnit().getId()
                                                : null)
                                .unitName2(secondary != null && secondary.getUnit() != null
                                                ? secondary.getUnit().getName()
                                                : null)
                                .jobPositionId2(secondary != null && secondary.getJobPosition() != null
                                                ? secondary.getJobPosition().getId()
                                                : null)
                                .jobName2(secondary != null && secondary.getJobPosition() != null
                                                ? secondary.getJobPosition().getName()
                                                : null)
                                .effectiveDate2(secondary != null ? secondary.getEffectiveDate() : null)
                                .createdAt(e.getCreatedAt())
                                .updatedAt(e.getUpdatedAt())
                                .deletedAt(e.getDeletedAt())
                                .build();
        }
}
