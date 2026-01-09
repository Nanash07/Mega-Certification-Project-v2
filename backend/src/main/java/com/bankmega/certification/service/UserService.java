package com.bankmega.certification.service;

import com.bankmega.certification.dto.UserRequest;
import com.bankmega.certification.dto.UserResponse;
import com.bankmega.certification.entity.Employee;
import com.bankmega.certification.entity.Role;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.exception.NotFoundException;
import com.bankmega.certification.repository.EmployeeRepository;
import com.bankmega.certification.repository.RoleRepository;
import com.bankmega.certification.repository.UserRepository;
import com.bankmega.certification.specification.UserSpecification;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final EmployeeRepository empRepo;

    @PersistenceContext
    private EntityManager em;

    // ===================== PERF CONSTANTS =====================
    private static final int BATCH_SIZE = 1000;
    private static final int IN_CHUNK = 800; // pecah IN(...) biar gak jebol
    private static final int BCRYPT_COST_BULK = 6; // hashing cepat khusus import

    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    // ===================== MAPPER =====================
    private static UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getResolvedEmail())
                .roleId(user.getRole() != null ? user.getRole().getId() : null)
                .roleName(user.getRole() != null ? user.getRole().getName() : null)
                .employeeId(user.getEmployee() != null ? user.getEmployee().getId() : null)
                .employeeNip(user.getEmployee() != null ? user.getEmployee().getNip() : null)
                .employeeName(user.getEmployee() != null ? user.getEmployee().getName() : null)
                .isActive(user.getIsActive())
                .isFirstLogin(user.getIsFirstLogin())
                .createdAt(user.getCreatedAt() != null ? FORMATTER.format(user.getCreatedAt()) : null)
                .updatedAt(user.getUpdatedAt() != null ? FORMATTER.format(user.getUpdatedAt()) : null)
                .build();
    }

    // ===================== ROLE HELPERS (PIC restriction) =====================

    private static boolean isPrivilegedRole(Role role) {
        if (role == null || role.getName() == null)
            return false;
        String name = role.getName().toUpperCase();
        return "SUPERADMIN".equals(name) || "PIC".equals(name) || "ROLE_PIC".equals(name);
    }

    private static void ensurePicCannotManageRole(boolean callerIsPic, Role targetRole) {
        if (callerIsPic && isPrivilegedRole(targetRole)) {
            throw new IllegalArgumentException("PIC tidak diperbolehkan mengelola user dengan role " +
                    targetRole.getName());
        }
    }

    // ===================== PAGE & GET =====================
    @Transactional(readOnly = true)
    public Page<UserResponse> getPage(Long roleId,
            Boolean isActive,
            String q,
            Pageable pageable,
            boolean callerIsPic) {
        Specification<User> spec = UserSpecification.notDeleted()
                .and(UserSpecification.byRoleId(roleId))
                .and(UserSpecification.byIsActive(isActive))
                .and(UserSpecification.bySearch(q));

        // PIC tidak boleh lihat user SUPERADMIN / PIC
        if (callerIsPic) {
            spec = spec.and(UserSpecification.excludeRoles(List.of("SUPERADMIN", "PIC", "ROLE_PIC")));
        }

        Pageable sorted = pageable.getSort().isUnsorted()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), Sort.by(Sort.Order.asc("username")))
                : pageable;

        // Saran: tambahkan @EntityGraph(attributePaths = {"role", "employee"}) di
        // UserRepository
        // untuk hilangin N+1
        return userRepo.findAll(spec, sorted).map(UserService::toResponse);
    }

    // versi lama (non PIC) biar kompatibel ke pemakaian lain
    @Transactional(readOnly = true)
    public Page<UserResponse> getPage(Long roleId, Boolean isActive, String q, Pageable pageable) {
        return getPage(roleId, isActive, q, pageable, false);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id, boolean callerIsPic) {
        User user = userRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("User dengan id " + id + " tidak ditemukan"));

        if (callerIsPic && isPrivilegedRole(user.getRole())) {
            // dari perspektif PIC pura-pura not found
            throw new NotFoundException("User dengan id " + id + " tidak ditemukan");
        }

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return getById(id, false);
    }

    // ===================== CREATE / UPDATE / DELETE =====================
    @Transactional
    public UserResponse create(UserRequest req, boolean callerIsPic) {
        String username = normalizeUsername(req.getUsername());
        if (username == null || username.isBlank()) {
            throw new ConflictException("Username wajib diisi");
        }

        Role role = roleRepo.findById(req.getRoleId())
                .orElseThrow(() -> new NotFoundException("Role tidak ditemukan dengan id " + req.getRoleId()));

        // 🔐 PIC tidak boleh create user dengan role SUPERADMIN / PIC
        ensurePicCannotManageRole(callerIsPic, role);

        Employee emp = null;
        if (req.getEmployeeId() != null) {
            emp = empRepo.findById(req.getEmployeeId())
                    .orElseThrow(
                            () -> new NotFoundException("Employee tidak ditemukan dengan id " + req.getEmployeeId()));
        }

        String rawPassword = (req.getPassword() != null && !req.getPassword().isBlank())
                ? req.getPassword()
                : username;

        User user = User.builder()
                .username(username)
                .email(trimToNull(req.getEmail())) // boleh null & duplikat
                .password(BCrypt.hashpw(rawPassword, BCrypt.gensalt()))
                .role(role)
                .employee(emp)
                .isActive(req.getIsActive() != null ? req.getIsActive() : true)
                .isFirstLogin(true)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        try {
            return toResponse(userRepo.save(user));
        } catch (DataIntegrityViolationException e) {
            // unik tetap ditahan oleh DB di username
            throw new ConflictException("Username sudah digunakan: " + username);
        }
    }

    @Transactional
    public UserResponse create(UserRequest req) {
        return create(req, false);
    }

    @Transactional
    public UserResponse update(Long id, UserRequest req, boolean callerIsPic) {
        User user = userRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("User tidak ditemukan dengan id " + id));

        // 🔐 PIC tidak boleh mengelola user SUPERADMIN/PIC
        if (callerIsPic && isPrivilegedRole(user.getRole())) {
            throw new IllegalArgumentException("PIC tidak diperbolehkan mengelola user dengan role " +
                    user.getRole().getName());
        }

        boolean changed = false;

        // username
        if (req.getUsername() != null) {
            String newUsername = normalizeUsername(req.getUsername());
            if (!Objects.equals(user.getUsername(), newUsername)) {
                user.setUsername(newUsername);
                changed = true;
            }
        }

        // email (boleh null & dupe)
        String newEmail = trimToNull(req.getEmail());
        if (!Objects.equals(user.getEmail(), newEmail)) {
            user.setEmail(newEmail);
            changed = true;
        }

        // password
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(BCrypt.hashpw(req.getPassword(), BCrypt.gensalt()));
            user.setIsFirstLogin(true);
            changed = true;
        }

        // role
        if (req.getRoleId() != null) {
            Long currentRoleId = user.getRole() != null ? user.getRole().getId() : null;
            if (!Objects.equals(currentRoleId, req.getRoleId())) {
                Role role = roleRepo.findById(req.getRoleId())
                        .orElseThrow(() -> new NotFoundException("Role tidak ditemukan dengan id " + req.getRoleId()));

                // 🔐 PIC tidak boleh ubah role menjadi SUPERADMIN/PIC
                ensurePicCannotManageRole(callerIsPic, role);

                user.setRole(role);
                changed = true;
            }
        }

        // employee link
        if (req.getEmployeeId() != null) {
            Long currentEmpId = user.getEmployee() != null ? user.getEmployee().getId() : null;
            if (!Objects.equals(currentEmpId, req.getEmployeeId())) {
                Employee emp = empRepo.findById(req.getEmployeeId())
                        .orElseThrow(() -> new NotFoundException(
                                "Employee tidak ditemukan dengan id " + req.getEmployeeId()));
                user.setEmployee(emp);
                changed = true;
            }
        }

        // status aktif
        if (req.getIsActive() != null && !Objects.equals(user.getIsActive(), req.getIsActive())) {
            user.setIsActive(req.getIsActive());
            changed = true;
        }

        if (!changed) {
            return toResponse(user); // no-op; hemat I/O
        }

        user.setUpdatedAt(Instant.now());

        try {
            return toResponse(userRepo.save(user));
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Username sudah digunakan: " + user.getUsername());
        }
    }

    @Transactional
    public UserResponse update(Long id, UserRequest req) {
        return update(id, req, false);
    }

    @Transactional
    public void softDelete(Long id, boolean callerIsPic) {
        User user = userRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("User tidak ditemukan dengan id " + id));

        if (callerIsPic && isPrivilegedRole(user.getRole())) {
            throw new IllegalArgumentException("PIC tidak diperbolehkan menghapus user dengan role " +
                    user.getRole().getName());
        }

        user.setIsActive(false);
        user.setDeletedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);
    }

    @Transactional
    public void softDelete(Long id) {
        softDelete(id, false);
    }

    @Transactional
    public UserResponse toggleStatus(Long id, boolean callerIsPic) {
        User user = userRepo.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new NotFoundException("User tidak ditemukan dengan id " + id));

        if (callerIsPic && isPrivilegedRole(user.getRole())) {
            throw new IllegalArgumentException("PIC tidak diperbolehkan mengubah status user dengan role " +
                    user.getRole().getName());
        }

        user.setIsActive(!user.getIsActive());
        user.setUpdatedAt(Instant.now());
        return toResponse(userRepo.save(user));
    }

    @Transactional
    public UserResponse toggleStatus(Long id) {
        return toggleStatus(id, false);
    }

    @Transactional
    public void changePasswordFirstLogin(Long userId, String newPassword) {
        User user = userRepo.findByIdAndDeletedAtIsNull(userId)
                .orElseThrow(() -> new NotFoundException("User tidak ditemukan dengan id " + userId));
        user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
        user.setIsFirstLogin(false);
        user.setUpdatedAt(Instant.now());
        userRepo.save(user);
    }

    // ===================== BATCH OPS (AFTER COMMIT import) =====================

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int batchUpsertAccountsByNips(List<String> nips, Role rolePegawai) {
        if (nips == null || nips.isEmpty())
            return 0;

        List<String> uniqNips = nips.stream()
                .filter(Objects::nonNull)
                .map(UserService::normalizeUsername)
                .filter(s -> !s.isBlank())
                .distinct()
                .toList();
        if (uniqNips.isEmpty())
            return 0;

        List<Employee> employees = fetchEmployeesByNips(uniqNips);
        if (employees.isEmpty())
            return 0;

        Map<String, Employee> empByNip = employees.stream().collect(Collectors.toMap(Employee::getNip, e -> e));
        Map<Long, Employee> empById = employees.stream().collect(Collectors.toMap(Employee::getId, e -> e));

        Set<Long> empIds = empById.keySet();
        Set<String> usernames = empByNip.keySet();

        List<User> usersByEmp = fetchUsersByEmployeeIds(empIds); // termasuk soft-deleted
        Map<Long, User> userByEmpId = usersByEmp.stream().collect(Collectors.toMap(
                u -> u.getEmployee() != null ? u.getEmployee().getId() : -1L,
                u -> u,
                UserService::newer));

        List<User> usersByUsername = fetchUsersByUsernames(usernames);
        Map<String, List<User>> usersByUsernameMultimap = new HashMap<>();
        for (User u : usersByUsername) {
            usersByUsernameMultimap.computeIfAbsent(u.getUsername(), k -> new ArrayList<>()).add(u);
        }

        List<User> toCreate = new ArrayList<>();
        List<User> toUpdate = new ArrayList<>();
        Instant now = Instant.now();

        for (String nip : uniqNips) {
            Employee e = empByNip.get(nip);
            if (e == null)
                continue;

            // A) prefer yang sudah link ke employee_id
            User linked = userByEmpId.get(e.getId());
            if (linked != null) {
                boolean needUpdate = false;
                if (linked.getDeletedAt() != null) {
                    linked.setDeletedAt(null);
                    needUpdate = true;
                }
                if (!Boolean.TRUE.equals(linked.getIsActive())) {
                    linked.setIsActive(true);
                    needUpdate = true;
                }
                if (linked.getRole() == null && rolePegawai != null) {
                    linked.setRole(rolePegawai);
                    needUpdate = true;
                }
                if (!Objects.equals(linked.getEmail(), e.getEmail())) {
                    linked.setEmail(e.getEmail());
                    needUpdate = true;
                }
                if (needUpdate) {
                    linked.setUpdatedAt(now);
                    toUpdate.add(linked);
                }

                // dedup username lain yang sama
                List<User> sameUsr = usersByUsernameMultimap.getOrDefault(nip, List.of());
                for (User d : sameUsr) {
                    if (!Objects.equals(d.getId(), linked.getId())) {
                        if (Boolean.TRUE.equals(d.getIsActive()) || d.getDeletedAt() == null) {
                            d.setIsActive(false);
                            d.setDeletedAt(now);
                            d.setUpdatedAt(now);
                            toUpdate.add(d);
                        }
                    }
                }
                continue;
            }

            // B) belum ada link → cari by username (NIP)
            List<User> sameUsername = usersByUsernameMultimap.getOrDefault(nip, List.of());
            if (!sameUsername.isEmpty()) {
                sameUsername.sort(UserService::compareByUpdatedThenIdDesc);
                User primary = sameUsername.get(0);
                boolean needUpdate = false;
                if (primary.getEmployee() == null || !Objects.equals(primary.getEmployee().getId(), e.getId())) {
                    primary.setEmployee(empRepo.getReferenceById(e.getId()));
                    needUpdate = true;
                }
                if (primary.getDeletedAt() != null) {
                    primary.setDeletedAt(null);
                    needUpdate = true;
                }
                if (!Boolean.TRUE.equals(primary.getIsActive())) {
                    primary.setIsActive(true);
                    needUpdate = true;
                }
                if (primary.getRole() == null && rolePegawai != null) {
                    primary.setRole(rolePegawai);
                    needUpdate = true;
                }
                if (!Objects.equals(primary.getEmail(), e.getEmail())) {
                    primary.setEmail(e.getEmail());
                    needUpdate = true;
                }
                if (needUpdate) {
                    primary.setUpdatedAt(now);
                    toUpdate.add(primary);
                }

                for (int i = 1; i < sameUsername.size(); i++) {
                    User d = sameUsername.get(i);
                    if (Boolean.TRUE.equals(d.getIsActive()) || d.getDeletedAt() == null) {
                        d.setIsActive(false);
                        d.setDeletedAt(now);
                        d.setUpdatedAt(now);
                        toUpdate.add(d);
                    }
                }
                continue;
            }

            // C) bener-bener belum ada → create baru
            User nu = User.builder()
                    .username(nip)
                    .email(e.getEmail()) // boleh null/duplikat
                    .password(hashBulk(nip))
                    .role(rolePegawai)
                    .employee(empRepo.getReferenceById(e.getId()))
                    .isActive(true)
                    .isFirstLogin(true)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();
            toCreate.add(nu);
        }

        // dedup toUpdate by id
        toUpdate = new ArrayList<>(toUpdate.stream()
                .collect(Collectors.toMap(User::getId, u -> u, (a, b) -> b, LinkedHashMap::new))
                .values());

        int affected = 0;
        affected += batchSaveUsers(toCreate);
        affected += batchSaveUsers(toUpdate);
        return affected;
    }

    /** Nonaktifkan akun untuk pegawai resign — chunked & idempotent. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int batchDeactivateByEmployeeIds(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty())
            return 0;

        List<Long> ids = employeeIds.stream().filter(Objects::nonNull).distinct().toList();
        if (ids.isEmpty())
            return 0;

        int total = 0;
        Instant now = Instant.now();
        for (List<Long> part : partition(ids, IN_CHUNK)) {
            List<User> users = userRepo.findByEmployee_IdIn(part);
            if (users.isEmpty())
                continue;

            boolean any = false;
            for (User u : users) {
                boolean need = false;
                if (!Boolean.FALSE.equals(u.getIsActive())) {
                    u.setIsActive(false);
                    need = true;
                }
                if (u.getDeletedAt() == null) {
                    u.setDeletedAt(now);
                    need = true;
                }
                if (need) {
                    u.setUpdatedAt(now);
                    any = true;
                }
            }
            if (any)
                total += batchSaveUsers(users);
        }
        return total;
    }

    // ===================== SEARCH UTILS =====================
    @Transactional(readOnly = true)
    public List<UserResponse> getAllActive() {
        return userRepo.findByDeletedAtIsNull().stream()
                .filter(User::getIsActive)
                .map(UserService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchActiveUsers(String q, boolean callerIsPic) {
        Specification<User> spec = UserSpecification.notDeleted()
                .and(UserSpecification.byIsActive(true))
                .and(UserSpecification.bySearch(q));

        if (callerIsPic) {
            spec = spec.and(UserSpecification.excludeRoles(List.of("SUPERADMIN", "PIC", "ROLE_PIC")));
        }

        return userRepo.findAll(spec).stream()
                .map(UserService::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchActiveUsers(String q) {
        return searchActiveUsers(q, false);
    }

    // ===================== INTERNAL UTILS =====================
    private static String normalizeUsername(String username) {
        return username == null ? null : username.trim();
    }

    private static String trimToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private int batchSaveUsers(List<User> list) {
        if (list == null || list.isEmpty())
            return 0;
        int n = 0;
        for (int i = 0; i < list.size(); i += BATCH_SIZE) {
            int end = Math.min(i + BATCH_SIZE, list.size());
            userRepo.saveAll(list.subList(i, end));
            em.flush();
            em.clear();
            n += (end - i);
        }
        return n;
    }

    private static String hashBulk(String raw) {
        return BCrypt.hashpw(raw, BCrypt.gensalt(BCRYPT_COST_BULK));
    }

    private static User newer(User a, User b) {
        Instant ua = a.getUpdatedAt(), ub = b.getUpdatedAt();
        if (ua == null && ub == null)
            return a.getId() > b.getId() ? a : b;
        if (ua == null)
            return b;
        if (ub == null)
            return a;
        return ua.isAfter(ub) ? a : b;
    }

    private static int compareByUpdatedThenIdDesc(User a, User b) {
        Instant ua = a.getUpdatedAt(), ub = b.getUpdatedAt();
        if (ua == null && ub == null)
            return Long.compare(b.getId(), a.getId());
        if (ua == null)
            return 1;
        if (ub == null)
            return -1;
        return ub.compareTo(ua);
    }

    private List<Employee> fetchEmployeesByNips(Collection<String> nips) {
        List<Employee> out = new ArrayList<>();
        for (List<String> part : partition(nips, IN_CHUNK)) {
            out.addAll(empRepo.findByNipIn(part));
        }
        return out;
    }

    private List<User> fetchUsersByEmployeeIds(Collection<Long> ids) {
        List<User> out = new ArrayList<>();
        for (List<Long> part : partition(ids, IN_CHUNK)) {
            out.addAll(userRepo.findByEmployee_IdIn(part));
        }
        return out;
    }

    private List<User> fetchUsersByUsernames(Collection<String> usernames) {
        List<User> out = new ArrayList<>();
        for (List<String> part : partition(usernames, IN_CHUNK)) {
            out.addAll(userRepo.findByUsernameIn(part));
        }
        return out;
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
