package com.bankmega.certification.security;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class AESUtil {

    private static final String ALGORITHM = "AES";
    private static final String TRANSFORMATION = "AES/CBC/PKCS5Padding";

    // Backward-compatible default for local development
    private static final String DEFAULT_SECRET = "MegaCertKey2025!";

    @Value("${app.aes.secret:" + DEFAULT_SECRET + "}")
    private String secretKey;

    // Static instance untuk backward compatibility
    private static AESUtil instance;

    @PostConstruct
    public void init() {
        instance = this;
    }

    private static String getSecretKey() {
        if (instance == null || instance.secretKey == null) {
            return DEFAULT_SECRET;
        }
        return instance.secretKey;
    }

    public static String encrypt(String plainText) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(getSecretKey().getBytes(StandardCharsets.UTF_8), ALGORITHM);

            byte[] iv = new byte[16];
            SecureRandom random = new SecureRandom();
            random.nextBytes(iv);
            IvParameterSpec ivSpec = new IvParameterSpec(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, ivSpec);
            byte[] encryptedBytes = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Gagal enkripsi AES: " + e.getMessage(), e);
        }
    }

    public static String decrypt(String encryptedText) {
        try {
            SecretKeySpec secretKey = new SecretKeySpec(getSecretKey().getBytes(StandardCharsets.UTF_8), ALGORITHM);

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
