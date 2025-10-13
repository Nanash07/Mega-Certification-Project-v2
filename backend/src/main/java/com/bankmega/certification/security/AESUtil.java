package com.bankmega.certification.security;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AESUtil — Enkripsi dan dekripsi AES (CBC mode) dengan key hardcoded.
 *
 * ⚠️ Catatan:
 * - Jangan pakai hardcoded key di production kalau bisa; gunakan env variable.
 * - Mode CBC dengan IV acak → hasil enkripsi selalu unik.
 * - Panjang key harus 16, 24, atau 32 karakter (AES-128 / AES-192 / AES-256)
 */
public class AESUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";

    // ✅ Hardcoded secret key (harus 16, 24, atau 32 karakter)
    private static final String SECRET_KEY = "MegaCertKey2025!";

    /**
     * 🔒 Enkripsi string (hasil = Base64(IV + CipherText))
     */
    public static String encrypt(String plainText) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), ALGORITHM);

            // Generate IV acak untuk tiap enkripsi
            byte[] iv = new byte[16];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            // Gabungkan IV + CipherText → Base64
            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Gagal enkripsi AES: " + e.getMessage(), e);
        }
    }

    /**
     * 🔓 Dekripsi string hasil encrypt()
     */
    public static String decrypt(String encryptedText) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(SECRET_KEY.getBytes(StandardCharsets.UTF_8), ALGORITHM);

            byte[] decoded = Base64.getDecoder().decode(encryptedText);

            // Pisahkan IV & CipherText
            byte[] iv = new byte[16];
            byte[] cipherText = new byte[decoded.length - 16];
            System.arraycopy(decoded, 0, iv, 0, 16);
            System.arraycopy(decoded, 16, cipherText, 0, cipherText.length);

            IvParameterSpec ivSpec = new IvParameterSpec(iv);
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, ivSpec);
            byte[] decryptedBytes = cipher.doFinal(cipherText);

            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Gagal dekripsi AES: " + e.getMessage(), e);
        }
    }
}
