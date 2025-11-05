package com.bankmega.certification.controller;

import com.bankmega.certification.entity.EmployeeBatch;
import com.bankmega.certification.entity.Notification;
import com.bankmega.certification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/{userId}")
    public ResponseEntity<List<Notification>> getUserNotifications(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUserNotifications(userId));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    @PostMapping("/test-email")
    public ResponseEntity<String> testEmail(@RequestParam String email) {
        notificationService.testEmail(email);
        return ResponseEntity.ok("Email test terkirim ke " + email);
    }

    // 🔹 Kirim notifikasi ke peserta dalam 1 batch (optional
    // ?status=REGISTERED/ATTENDED/PASSED/FAILED)
    @PostMapping("/batches/{batchId}/send")
    public ResponseEntity<?> sendBatchNotifications(
            @PathVariable Long batchId,
            @RequestParam(required = false) EmployeeBatch.Status status) {
        int sent = notificationService.notifyParticipantsByBatch(batchId, status);
        return ResponseEntity.ok().body(java.util.Map.of("sent", sent));
    }
}
