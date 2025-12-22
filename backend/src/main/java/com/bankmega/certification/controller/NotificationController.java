package com.bankmega.certification.controller;

import com.bankmega.certification.dto.NotificationResponse;
import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.entity.Notification;
import com.bankmega.certification.security.UserPrincipal;
import com.bankmega.certification.service.NotificationService;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/filter")
    public ResponseEntity<Page<NotificationResponse>> filterNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size) {

        String fromRaw = from != null ? from : startDate; // support dua param
        String toRaw = to != null ? to : endDate; // support dua param

        LocalDateTime fromDt = fromRaw != null ? LocalDateTime.parse(fromRaw + "T00:00:00") : null; // start day
        LocalDateTime toDt = toRaw != null ? LocalDateTime.parse(toRaw + "T23:59:59") : null; // end day

        Page<Notification> result = notificationService.searchNotifications(
                principal.getEmployeeId(),
                unread,
                fromDt,
                toDt,
                type,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        return ResponseEntity.ok(result.map(this::toResponse));
    }

    @GetMapping("/sent/filter")
    public ResponseEntity<Page<NotificationResponse>> filterSentNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Boolean unread,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        String fromRaw = from != null ? from : startDate; // support dua param
        String toRaw = to != null ? to : endDate; // support dua param

        LocalDateTime fromDt = fromRaw != null ? LocalDateTime.parse(fromRaw + "T00:00:00") : null; // start day
        LocalDateTime toDt = toRaw != null ? LocalDateTime.parse(toRaw + "T23:59:59") : null; // end day

        boolean isSuperadmin = principal != null
                && principal.getRole() != null
                && "SUPERADMIN".equalsIgnoreCase(principal.getRole().getName()); // check role dari principal

        Long currentUserId = principal != null ? principal.getId() : null; // userId = principal.id

        Page<Notification> result = notificationService.searchSentNotifications(
                isSuperadmin,
                currentUserId,
                unread,
                fromDt,
                toDt,
                type,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<Long> employeeIds = result.getContent().stream().map(Notification::getUserId).distinct().toList(); // ambil
                                                                                                                // penerima
        Map<Long, com.bankmega.certification.entity.Employee> empMap = notificationService
                .mapEmployeesByIds(employeeIds); // map employee

        Page<NotificationResponse> mapped = result.map(n -> {
            NotificationResponse base = toResponse(n); // base response
            var emp = empMap.get(n.getUserId()); // lookup employee penerima

            return NotificationResponse.builder()
                    .id(base.getId())
                    .title(base.getTitle())
                    .message(base.getMessage())
                    .read(base.isRead())
                    .readAt(base.getReadAt())
                    .createdAt(base.getCreatedAt())
                    .sentAt(base.getSentAt())
                    .relatedEntity(base.getRelatedEntity())
                    .relatedEntityId(base.getRelatedEntityId())
                    .type(base.getType())
                    .userId(n.getUserId())
                    .employeeName(emp != null ? emp.getName() : null)
                    .employeeNip(emp != null ? emp.getNip() : null)
                    .employeeEmail(emp != null ? emp.getEmail() : null)
                    .build();
        });

        return ResponseEntity.ok(mapped);
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<NotificationResponse> result = notificationService
                .getUserNotifications(principal.getEmployeeId())
                .stream()
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(result);
    }

    // 🔔 dipakai navbar: /api/notifications/latest?limit=5
    @GetMapping("/latest")
    public ResponseEntity<List<NotificationResponse>> getLatestNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(name = "limit", defaultValue = "5") int limit) {

        if (limit <= 0) {
            limit = 5;
        } else if (limit > 50) {
            limit = 50;
        }

        List<NotificationResponse> result = notificationService
                .getUserNotifications(principal.getEmployeeId())
                .stream()
                .limit(limit)
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(notificationService.getUnreadCount(principal.getEmployeeId()));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserPrincipal principal) {

        notificationService.markAsRead(notificationId, principal.getEmployeeId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/batches/{batchId}/send")
    public ResponseEntity<?> sendBatchNotifications(
            @PathVariable Long batchId,
            @RequestParam(required = false) EmployeeBatch.Status status) {

        int sent = notificationService.notifyParticipantsByBatch(batchId, status);
        return ResponseEntity.ok().body(java.util.Map.of("sent", sent));
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .read(n.isRead())
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .sentAt(n.getSentAt())
                .relatedEntity(n.getRelatedEntity())
                .relatedEntityId(n.getRelatedEntityId())
                .type(n.getType() != null ? n.getType().name() : null)
                .build();
    }
}
