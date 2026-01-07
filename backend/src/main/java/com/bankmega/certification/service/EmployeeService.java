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

@Service
@RequiredArgsConstructor
public class EmployeeService {

        private final EmployeeRepository repo;
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
                        String search,
                        Pageable pageable) {

                Specification<Employee> spec = Specification.where(EmployeeSpecification.activePageOnly())
                                .and(EmployeeSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeSpecification.byRegionalIds(regionalIds))
                                .and(EmployeeSpecification.byDivisionIds(divisionIds))
                                .and(EmployeeSpecification.byUnitIds(unitIds))
                                .and(EmployeeSpecification.byJobPositionIds(jobPositionIds))
                                .and(EmployeeSpecification.bySearch(search));

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
                        Pageable pageable) {

                Specification<Employee> spec = Specification.where(EmployeeSpecification.resignedPageOnly())
                                .and(EmployeeSpecification.byEmployeeIds(employeeIds))
                                .and(EmployeeSpecification.byRegionalIds(regionalIds))
                                .and(EmployeeSpecification.byDivisionIds(divisionIds))
                                .and(EmployeeSpecification.byUnitIds(unitIds))
                                .and(EmployeeSpecification.byJobPositionIds(jobPositionIds))
                                .and(EmployeeSpecification.bySearch(search));

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
                Specification<Employee> spec = Specification.where(EmployeeSpecification.activePageOnly())
                                .and(EmployeeSpecification.byRegionalId(regionalId))
                                .and(EmployeeSpecification.byDivisionId(divisionId))
                                .and(EmployeeSpecification.byUnitId(unitId));

                return repo.count(spec);
        }

        @Transactional(readOnly = true)
        public EmployeeResponse getById(Long id) {
                Employee emp = repo.findById(id)
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
                historyService.snapshot(saved, EmployeeHistory.EmployeeActionType.CREATED, saved.getEffectiveDate());

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

                String oldJobTitle = emp.getJobPosition() != null ? emp.getJobPosition().getName() : null;
                String oldUnitName = emp.getUnit() != null ? emp.getUnit().getName() : null;
                String oldDivisionName = emp.getDivision() != null ? emp.getDivision().getName() : null;
                String oldRegionalName = emp.getRegional() != null ? emp.getRegional().getName() : null;

                Long oldJobId = emp.getJobPosition() != null ? emp.getJobPosition().getId() : null;
                Long oldUnitId = emp.getUnit() != null ? emp.getUnit().getId() : null;
                Long oldDivisionId = emp.getDivision() != null ? emp.getDivision().getId() : null;
                Long oldRegionalId = emp.getRegional() != null ? emp.getRegional().getId() : null;

                emp = mapRequestToEntity(emp, req);
                emp.setUpdatedAt(Instant.now());

                Employee saved = repo.save(emp);

                boolean orgChanged = !Objects.equals(oldRegionalId,
                                saved.getRegional() != null ? saved.getRegional().getId() : null)
                                || !Objects.equals(oldDivisionId,
                                                saved.getDivision() != null ? saved.getDivision().getId() : null)
                                || !Objects.equals(oldUnitId, saved.getUnit() != null ? saved.getUnit().getId() : null)
                                || !Objects.equals(oldJobId,
                                                saved.getJobPosition() != null ? saved.getJobPosition().getId() : null);

                EmployeeHistory.EmployeeActionType type = orgChanged
                                ? EmployeeHistory.EmployeeActionType.MUTASI
                                : EmployeeHistory.EmployeeActionType.UPDATED;

                historyService.snapshotWithOldValues(
                                saved,
                                oldJobTitle,
                                oldUnitName,
                                oldDivisionName,
                                oldRegionalName,
                                type,
                                saved.getEffectiveDate());

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
                        historyService.snapshot(saved, EmployeeHistory.EmployeeActionType.RESIGN,
                                        saved.getEffectiveDate());
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
                historyService.snapshot(saved, EmployeeHistory.EmployeeActionType.TERMINATED, saved.getEffectiveDate());
        }

        private Employee mapRequestToEntity(Employee emp, EmployeeRequest req) {
                Regional reg = regionalRepo.findById(req.getRegionalId())
                                .orElseThrow(() -> new NotFoundException("Regional not found: " + req.getRegionalId()));
                Division div = divisionRepo.findById(req.getDivisionId())
                                .orElseThrow(() -> new NotFoundException("Division not found: " + req.getDivisionId()));
                Unit unit = unitRepo.findById(req.getUnitId())
                                .orElseThrow(() -> new NotFoundException("Unit not found: " + req.getUnitId()));
                JobPosition job = jobPositionRepo.findById(req.getJobPositionId())
                                .orElseThrow(() -> new NotFoundException(
                                                "JobPosition not found: " + req.getJobPositionId()));

                emp.setNip(req.getNip());
                emp.setName(req.getName());
                emp.setEmail(req.getEmail());
                emp.setGender(req.getGender());
                emp.setRegional(reg);
                emp.setDivision(div);
                emp.setUnit(unit);
                emp.setJobPosition(job);
                emp.setEffectiveDate(req.getEffectiveDate());
                emp.setStatus(req.getStatus());

                return emp;
        }

        private boolean hasChanged(Employee emp, EmployeeRequest req) {
                return !Objects.equals(emp.getName(), req.getName())
                                || !Objects.equals(emp.getEmail(), req.getEmail())
                                || !Objects.equals(emp.getGender(), req.getGender())
                                || !Objects.equals(emp.getStatus(), req.getStatus())
                                || !Objects.equals(emp.getEffectiveDate(), req.getEffectiveDate())
                                || !Objects.equals(emp.getRegional() != null ? emp.getRegional().getId() : null,
                                                req.getRegionalId())
                                || !Objects.equals(emp.getDivision() != null ? emp.getDivision().getId() : null,
                                                req.getDivisionId())
                                || !Objects.equals(emp.getUnit() != null ? emp.getUnit().getId() : null,
                                                req.getUnitId())
                                || !Objects.equals(emp.getJobPosition() != null ? emp.getJobPosition().getId() : null,
                                                req.getJobPositionId());
        }

        private EmployeeResponse toResponse(Employee e) {
                return EmployeeResponse.builder()
                                .id(e.getId())
                                .nip(e.getNip())
                                .name(e.getName())
                                .email(e.getEmail())
                                .gender(e.getGender())
                                .regionalId(e.getRegional() != null ? e.getRegional().getId() : null)
                                .regionalName(e.getRegional() != null ? e.getRegional().getName() : null)
                                .divisionId(e.getDivision() != null ? e.getDivision().getId() : null)
                                .divisionName(e.getDivision() != null ? e.getDivision().getName() : null)
                                .unitId(e.getUnit() != null ? e.getUnit().getId() : null)
                                .unitName(e.getUnit() != null ? e.getUnit().getName() : null)
                                .jobPositionId(e.getJobPosition() != null ? e.getJobPosition().getId() : null)
                                .jobName(e.getJobPosition() != null ? e.getJobPosition().getName() : null)
                                .effectiveDate(e.getEffectiveDate())
                                .status(e.getStatus())
                                .createdAt(e.getCreatedAt())
                                .updatedAt(e.getUpdatedAt())
                                .deletedAt(e.getDeletedAt())
                                .build();
        }
}
