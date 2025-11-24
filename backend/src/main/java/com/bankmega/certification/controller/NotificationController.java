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
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        LocalDateTime fromDt = from != null ? LocalDateTime.parse(from + "T00:00:00") : null;
        LocalDateTime toDt = to != null ? LocalDateTime.parse(to + "T23:59:59") : null;

        Page<Notification> result = notificationService.searchNotifications(
                principal.getEmployeeId(),
                unread,
                fromDt,
                toDt,
                type,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));

        return ResponseEntity.ok(result.map(this::toResponse));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {

        List<NotificationResponse> result = notificationService
                .getUserNotifications(principal.getEmployeeId())
                .stream().map(this::toResponse).toList();

        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(
                notificationService.getUnreadCount(principal.getEmployeeId()));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserPrincipal principal) {

        notificationService.markAsRead(notificationId, principal.getEmployeeId());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/test-email")
    public ResponseEntity<String> testEmail(@RequestParam String email) {
        notificationService.testEmail(email);
        return ResponseEntity.ok("Email test terkirim ke " + email);
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
