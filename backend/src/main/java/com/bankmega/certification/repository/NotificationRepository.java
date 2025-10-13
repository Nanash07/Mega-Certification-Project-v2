package com.bankmega.certification.repository;

import com.bankmega.certification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // ambil semua notifikasi user berdasarkan waktu terbaru
    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    // hitung jumlah notif yang belum dibaca
    long countByRecipientIdAndReadStatusFalse(Long recipientId);
}
