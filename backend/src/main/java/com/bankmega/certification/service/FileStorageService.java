package com.bankmega.certification.service;

import com.bankmega.certification.entity.EmployeeCertification;
import com.bankmega.certification.repository.EmployeeCertificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class FileStorageService {

    private static final String STORAGE_DIR = "C:/Users/nakul/Documents/Magang/Project/MegaCertification/storage";

    // Supported content types
    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/png", "image/jpg", "image/jpeg", "image/gif", "image/webp", "image/bmp");
    private static final Set<String> ALLOWED_PDF_TYPES = Set.of(
            "application/pdf");

    private final EmployeeCertificationRepository certificationRepo;

    // ================== SAVE ==================
    public String save(Long certificationId, MultipartFile file) {
        try {
            EmployeeCertification ec = certificationRepo.findById(Objects.requireNonNull(certificationId))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certification not found"));

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

            // Validate file type - accept images and PDFs
            if (contentType == null ||
                    !(ALLOWED_IMAGE_TYPES.contains(contentType) || ALLOWED_PDF_TYPES.contains(contentType))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Hanya file gambar (PNG, JPG, JPEG, GIF, WebP) atau PDF yang diperbolehkan");
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
            file.transferTo(Objects.requireNonNull(filePath.toFile()));

            ec.setFileUrl(newFileName.toString()); // simpan hanya nama file
            ec.setFileName(originalName);
            ec.setFileType(contentType);
            certificationRepo.save(ec);

            log.info("File saved successfully: {}", newFileName);
            return newFileName.toString();

        } catch (IOException e) {
            log.error("Failed to save file", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal menyimpan file", e);
        }
    }

    // ================== DELETE ==================
    public void deleteCertificate(Long certificationId) {
        EmployeeCertification ec = certificationRepo.findById(Objects.requireNonNull(certificationId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certification not found"));

        if (ec.getFileUrl() != null) {
            Path filePath = Paths.get(STORAGE_DIR).resolve(ec.getFileUrl());
            try {
                boolean deleted = Files.deleteIfExists(filePath);
                log.info("File deletion result for {}: {}", ec.getFileUrl(), deleted);
            } catch (IOException e) {
                log.error("Failed to delete file from storage", e);
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal menghapus file dari storage",
                        e);
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
        EmployeeCertification ec = certificationRepo.findById(Objects.requireNonNull(certificationId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Certification not found"));

        if (ec.getFileUrl() == null || ec.getFileUrl().isBlank()) {
            log.warn("No file URL for certification id: {}", certificationId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File sertifikat belum ada");
        }

        try {
            Path filePath = Paths.get(STORAGE_DIR).resolve(ec.getFileUrl());
            log.info("Attempting to serve file: {}", filePath);

            if (!Files.exists(filePath)) {
                log.error("File not found at path: {}", filePath);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File tidak ditemukan di storage");
            }

            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                log.error("Resource not readable: {}", filePath);
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File tidak dapat dibaca");
            }

            // Determine content type
            String contentType = ec.getFileType();
            if (contentType == null || contentType.isBlank()) {
                // Try to probe file content type
                try {
                    contentType = Files.probeContentType(filePath);
                } catch (IOException e) {
                    contentType = "application/octet-stream";
                }
            }

            String fileNameToUse = download
                    ? (ec.getFileName() != null ? ec.getFileName() : ec.getFileUrl())
                    : ec.getFileUrl();

            String contentDisposition = download
                    ? "attachment; filename=\"" + fileNameToUse + "\""
                    : "inline; filename=\"" + fileNameToUse + "\"";

            log.info("Serving file: {} with content-type: {}", fileNameToUse, contentType);

            return ResponseEntity.ok()
                    .contentType(
                            MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
                    .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition)
                    .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                    .header(HttpHeaders.PRAGMA, "no-cache")
                    .header(HttpHeaders.EXPIRES, "0")
                    .body(resource);

        } catch (ResponseStatusException e) {
            throw e; // Re-throw ResponseStatusException as-is
        } catch (Exception e) {
            log.error("Failed to serve file for certification id: {}", certificationId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal membuka file sertifikat", e);
        }
    }

    // ================== CHECK IF FILE EXISTS ==================
    public boolean hasFile(Long certificationId) {
        return certificationRepo.findById(certificationId)
                .map(ec -> ec.getFileUrl() != null && !ec.getFileUrl().isBlank())
                .orElse(false);
    }

    // ================== CHECK IF PHYSICAL FILE EXISTS ==================
    public boolean physicalFileExists(Long certificationId) {
        return certificationRepo.findById(certificationId)
                .filter(ec -> ec.getFileUrl() != null && !ec.getFileUrl().isBlank())
                .map(ec -> {
                    Path filePath = Paths.get(STORAGE_DIR).resolve(ec.getFileUrl());
                    return Files.exists(filePath);
                })
                .orElse(false);
    }
}