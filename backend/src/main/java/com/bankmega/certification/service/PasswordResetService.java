package com.bankmega.certification.service;

import com.bankmega.certification.entity.PasswordResetToken;
import com.bankmega.certification.entity.User;
import com.bankmega.certification.exception.ConflictException;
import com.bankmega.certification.repository.PasswordResetTokenRepository;
import com.bankmega.certification.repository.UserRepository;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private final UserRepository userRepo;
    private final PasswordResetTokenRepository tokenRepo;
    private final JavaMailSender reusableMailSender; // bean dari MailSenderConfig

    // Saran: ganti ke http saat dev biar gak ribet SSL
    @Value("${app.frontend.base-url:http://localhost:5173}")
    private String frontendBaseUrl;

    @Value("${app.auth.reset-password.expiry-minutes:15}")
    private long expiryMinutes;

    /**
     * Return:
     * - true => akun ditemukan & email reset DIUSAHAKAN dikirim
     * - false => akun tidak ditemukan / tidak aktif / tidak punya email
     */
    @Transactional
    public boolean requestReset(String email, String username) {
        String cleanedEmail = trimToNull(email);
        String cleanedUsername = trimToNull(username);

        if (cleanedEmail == null && cleanedUsername == null) {
            throw new ConflictException("Email atau username wajib diisi");
        }

        Optional<User> optUser = Optional.empty();

        if (cleanedEmail != null) {
            optUser = userRepo.findByEmailAndDeletedAtIsNull(cleanedEmail);
        }

        if (optUser.isEmpty() && cleanedUsername != null) {
            optUser = userRepo.findByUsernameAndDeletedAtIsNull(cleanedUsername);
        }

        if (optUser.isEmpty()) {
            log.warn("Password reset: user tidak ditemukan untuk email={} / username={}", cleanedEmail,
                    cleanedUsername);
            return false; // akun tidak ada
        }

        User user = optUser.get();
        if (!Boolean.TRUE.equals(user.getIsActive()) || user.getDeletedAt() != null) {
            log.warn("Password reset: user {} nonaktif / terhapus, skip", user.getId());
            return false; // akun tidak aktif / deleted
        }

        String rawToken = UUID.randomUUID().toString();
        Instant expiry = Instant.now().plus(expiryMinutes, ChronoUnit.MINUTES);

        PasswordResetToken tokenEntity = tokenRepo.findByUser(user)
                .orElseGet(() -> PasswordResetToken.builder()
                        .user(user)
                        .build());

        tokenEntity.setToken(rawToken);
        tokenEntity.setExpiryDate(expiry);
        tokenRepo.save(tokenEntity);

        String encodedToken = URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        String resetLink = frontendBaseUrl + "/reset-password?token=" + encodedToken;

        String targetEmail = resolveTargetEmail(user);
        if (targetEmail == null) {
            log.warn("Password reset: user {} tidak punya email (user.email & employee.email null), skip kirim email",
                    user.getId());
            return false; // gak ada email tujuan
        }

        log.info("Password reset: kirim email reset ke {} untuk user {}", targetEmail, user.getId());
        sendPasswordResetEmailAsync(targetEmail, resetLink);

        return true; // sukses: akun ada, aktif, dan ada email tujuan
    }

    @Transactional(readOnly = true)
    public boolean validateToken(String token) {
        if (token == null || token.isBlank()) {
            return false;
        }

        final String cleaned = token.trim();

        return tokenRepo.findByToken(cleaned)
                .filter(t -> t.getExpiryDate().isAfter(Instant.now()))
                .isPresent();
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        if (token == null || token.isBlank()) {
            throw new ConflictException("Token reset password wajib diisi");
        }
        if (newPassword == null || newPassword.isBlank()) {
            throw new ConflictException("Password baru wajib diisi");
        }
        if (newPassword.length() < 6) {
            throw new ConflictException("Password baru minimal 6 karakter");
        }

        PasswordResetToken tokenEntity = tokenRepo.findByToken(token.trim())
                .orElseThrow(() -> new ConflictException("Token reset password tidak valid"));

        if (tokenEntity.getExpiryDate().isBefore(Instant.now())) {
            tokenRepo.delete(tokenEntity);
            throw new ConflictException("Token reset password sudah kadaluarsa");
        }

        User user = tokenEntity.getUser();
        if (user.getDeletedAt() != null || !Boolean.TRUE.equals(user.getIsActive())) {
            tokenRepo.delete(tokenEntity);
            throw new ConflictException("User tidak aktif");
        }

        String hashed = BCrypt.hashpw(newPassword, BCrypt.gensalt());
        user.setPassword(hashed);
        user.setIsFirstLogin(false);
        user.setUpdatedAt(Instant.now());

        userRepo.save(user);
        tokenRepo.delete(tokenEntity);
    }

    @Async
    public void sendPasswordResetEmailAsync(String to, String resetLink) {
        if (to == null || to.isBlank()) {
            return;
        }

        String subject = "Reset Password Akun Mega Certification System";

        String bodyPlain = """
                Halo,

                Kami menerima permintaan reset password untuk akun Anda di Mega Certification System.

                Silakan klik link berikut untuk mengatur ulang password Anda:
                %s

                Jika Anda tidak merasa meminta reset password, abaikan email ini.

                Salam,
                Mega Certification System
                """.formatted(resetLink);

        try {
            MimeMessage message = reusableMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String fromAddr = Objects.toString(getUsernameSafe(), "no-reply@megacert.local");
            helper.setFrom(fromAddr);
            helper.setTo(to);
            helper.setSubject(subject);

            String escaped = htmlEscape(bodyPlain)
                    .replace("\r\n", "\n")
                    .replace("\n", "<br/>");

            String html = "<div style='font-family:Arial,sans-serif;line-height:1.6;font-size:14px'>"
                    + escaped
                    + "<br><p style='font-size:12px;color:gray;margin-top:8px;'>--<br>"
                    + "Dikirim otomatis oleh <b>Mega Certification System</b></p></div>";

            helper.setText(html, true);
            reusableMailSender.send(message);
            log.info("Email reset password terkirim ke {}", to);
        } catch (Exception e) {
            log.error("Gagal kirim email reset password ke {}", to, e);
        }
    }

    private String getUsernameSafe() {
        try {
            if (reusableMailSender instanceof org.springframework.mail.javamail.JavaMailSenderImpl senderImpl) {
                return senderImpl.getUsername();
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static String trimToNull(String s) {
        if (s == null)
            return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private String resolveTargetEmail(User user) {
        if (user == null)
            return null;

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail().trim();
        }
        if (user.getEmployee() != null &&
                user.getEmployee().getEmail() != null &&
                !user.getEmployee().getEmail().isBlank()) {
            return user.getEmployee().getEmail().trim();
        }
        return null;
    }

    private String htmlEscape(String s) {
        if (s == null)
            return "";
        String out = s;
        out = out.replace("&", "&amp;");
        out = out.replace("<", "&lt;");
        out = out.replace(">", "&gt;");
        out = out.replace("\"", "&quot;");
        out = out.replace("'", "&#039;");
        return out;
    }
}
