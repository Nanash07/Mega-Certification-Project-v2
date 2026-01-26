package com.bankmega.certification.util;

import com.bankmega.certification.exception.ConflictException;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

public final class PasswordValidator {

    private PasswordValidator() {
        // Utility class, tidak perlu instantiate
    }

    public static final int MIN_LENGTH = 8;

    private static final Pattern UPPERCASE_PATTERN = Pattern.compile("[A-Z]");
    private static final Pattern LOWERCASE_PATTERN = Pattern.compile("[a-z]");
    private static final Pattern DIGIT_PATTERN = Pattern.compile("[0-9]");

    public static void validate(String password) {
        List<String> errors = getValidationErrors(password);
        if (!errors.isEmpty()) {
            throw new ConflictException("Password tidak memenuhi syarat: " + String.join(", ", errors));
        }
    }

    public static boolean isValid(String password) {
        return getValidationErrors(password).isEmpty();
    }

    public static List<String> getValidationErrors(String password) {
        List<String> errors = new ArrayList<>();

        if (password == null || password.isBlank()) {
            errors.add("Password wajib diisi");
            return errors;
        }

        if (password.length() < MIN_LENGTH) {
            errors.add("minimal " + MIN_LENGTH + " karakter");
        }

        if (!UPPERCASE_PATTERN.matcher(password).find()) {
            errors.add("minimal 1 huruf besar");
        }

        if (!LOWERCASE_PATTERN.matcher(password).find()) {
            errors.add("minimal 1 huruf kecil");
        }

        if (!DIGIT_PATTERN.matcher(password).find()) {
            errors.add("minimal 1 angka");
        }

        return errors;
    }
}
