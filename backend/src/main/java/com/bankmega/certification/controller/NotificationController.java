package com.bankmega.certification.controller;

import com.bankmega.certification.entity.Notification;
import com.bankmega.certification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Ambil semua notifikasi milik user
     */
    @GetMapping("/{userId}")
    public ResponseEntity<List<Notification>> getUserNotifications(@PathVariable Long userId) {
        List<Notification> notifications = notificationService.getUserNotifications(userId);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Tandai notifikasi sudah dibaca
     */
    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long notificationId) {
        notificationService.markAsRead(notificationId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Hitung jumlah notifikasi yang belum dibaca
     */
    @GetMapping("/{userId}/unread-count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable Long userId) {
        long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(count);
    }

    /**
     * Endpoint manual untuk mengirim notifikasi (admin/pic trigger)
     */
    @PostMapping("/send")
    public ResponseEntity<?> sendNotification(
            @RequestParam Long recipientId,
            @RequestParam(required = false) String recipientEmail,
            @RequestParam String title,
            @RequestParam String message) {
        try {
            Notification notif = notificationService.sendNotification(recipientId, recipientEmail, title, message);
            return ResponseEntity.status(HttpStatus.CREATED).body(notif);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Gagal mengirim notifikasi: " + e.getMessage());
        }
    }

    /**
     * Endpoint untuk mengetes pengiriman email
     */
    @PostMapping("/test-mail")
    public ResponseEntity<String> testMail(@RequestParam String to) {
        try {
            notificationService.testEmail(to);
            return ResponseEntity.ok("Email test berhasil dikirim ke " + to);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Gagal mengirim email test: " + e.getMessage());
        }
    }
}
