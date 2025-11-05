package com.bankmega.certification.repository;

import com.bankmega.certification.entity.PicCertificationScope;
import com.bankmega.certification.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PicCertificationScopeRepository extends JpaRepository<PicCertificationScope, Long> {

    // Ambil semua scope PIC berdasarkan User
    List<PicCertificationScope> findByUser(User user);

    // Hapus semua scope berdasarkan User
    void deleteByUser(User user);

    // Ambil scope PIC by userId (buat validasi)
    List<PicCertificationScope> findByUser_Id(Long userId);

    // Ambil certificationId yang boleh di-manage PIC
    List<PicCertificationScope> findDistinctByUser_Id(Long userId);

    // Ambil certificationCode yang boleh di-manage PIC
    List<PicCertificationScope> findByUser_IdAndCertification_CodeIgnoreCase(Long userId, String code);
}
