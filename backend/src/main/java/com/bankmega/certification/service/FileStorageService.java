package com.bankmega.certification.service;

import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final String STORAGE_DIR = "C:/Users/nakul/Documents/Magang/Project/MegaCertification/storage";

    private final EmployeeCertificationRepository certificationRepo;

    // ================== SAVE ==================
    public String save(Long certificationId, MultipartFile file) {
        try {
            EmployeeCertification ec = certificationRepo.findById(certificationId)
                    .orElseThrow(() -> new RuntimeException("Certification not found"));

            String nip = ec.getEmployee().getNip();
            String certCode = ec.getCertificationRule().getCertification().getCode();

            Integer levelCode = ec.getCertificationRule().getCertificationLevel() != null
                    ? ec.getCertificationRule().getCertificationLevel().getLevel()
                    : null;

            String subCode = ec.getCertificationRule().getSubField() != null
                    ? ec.getCertificationRule().getSubField().getCode()
                    : null;

            String originalName = file.getOriginalFilename();
            String contentType = file.getContentType();
            if (contentType == null ||
                    !(contentType.equals("image/png")
                            || contentType.equals("image/jpg")
                            || contentType.equals("image/jpeg"))) {
                throw new IllegalArgumentException("Hanya file PNG, JPG, atau JPEG yang diperbolehkan");
            }

            String extension = "";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf("."));
            }

            String timestamp = LocalDateTime.now()
                    .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));

            StringBuilder newFileName = new StringBuilder();
            newFileName.append(nip).append("_").append(certCode);

            if (levelCode != null) {
                newFileName.append("_L").append(levelCode);
            }
            if (subCode != null && !subCode.isBlank()) {
                newFileName.append("_").append(subCode);
            }

            newFileName.append("_").append(timestamp).append(extension);

            Path storagePath = Paths.get(STORAGE_DIR);
            if (!Files.exists(storagePath)) {
                Files.createDirectories(storagePath);
            }

            Path filePath = storagePath.resolve(newFileName.toString());
            file.transferTo(filePath.toFile());

            ec.setFileUrl(newFileName.toString()); // simpan hanya nama file
            ec.setFileName(originalName);
            ec.setFileType(contentType != null ? contentType : "image/jpeg");
            certificationRepo.save(ec);

            return newFileName.toString();

        } catch (IOException e) {
            throw new RuntimeException("Gagal menyimpan file", e);
        }
    }

    // ================== DELETE ==================
    public void deleteCertificate(Long certificationId) {
        EmployeeCertification ec = certificationRepo.findById(certificationId)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        if (ec.getFileUrl() != null) {
            Path filePath = Paths.get(STORAGE_DIR).resolve(ec.getFileUrl());
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                throw new RuntimeException("Gagal menghapus file dari storage", e);
            }
        }

        // Reset info file di entity
        ec.setFileUrl(null);
        ec.setFileName(null);
        ec.setFileType(null);
        certificationRepo.save(ec);
    }

    // ================== SERVE FILE (Preview / Download) ==================
    public ResponseEntity<Resource> serveFile(Long certificationId, boolean download) {
        EmployeeCertification ec = certificationRepo.findById(certificationId)
                .orElseThrow(() -> new RuntimeException("Certification not found"));

        if (ec.getFileUrl() == null) {
            throw new RuntimeException("File sertifikat belum ada");
        }

        try {
            Path filePath = Paths.get(STORAGE_DIR).resolve(ec.getFileUrl());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                throw new RuntimeException("File tidak ditemukan");
            }

            String fileNameToUse = download ? ec.getFileUrl() : ec.getFileName();

            String contentDisposition = download
                    ? "attachment; filename=\"" + fileNameToUse + "\""
                    : "inline; filename=\"" + fileNameToUse + "\"";

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            ec.getFileType() != null ? ec.getFileType() : "image/jpeg"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .body(resource);

        } catch (Exception e) {
            throw new RuntimeException("Gagal membuka file sertifikat", e);
        }
    }
}