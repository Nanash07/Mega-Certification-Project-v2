package com.bankmega.certification.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("PasswordValidator Tests")
class PasswordValidatorTest {

    @Test
    @DisplayName("Valid password should pass all validations")
    void validPassword_ShouldPass() {
        String password = "SecurePass123";

        assertTrue(PasswordValidator.isValid(password));
        assertDoesNotThrow(() -> PasswordValidator.validate(password));
        assertTrue(PasswordValidator.getValidationErrors(password).isEmpty());
    }

    @Test
    @DisplayName("Password with all requirements including special chars should pass")
    void complexPassword_ShouldPass() {
        String password = "MyP@ssw0rd!2025";

        assertTrue(PasswordValidator.isValid(password));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("Null or empty password should fail")
    void nullOrEmptyPassword_ShouldFail(String password) {
        assertFalse(PasswordValidator.isValid(password));

        List<String> errors = PasswordValidator.getValidationErrors(password);
        assertFalse(errors.isEmpty());
        assertTrue(errors.stream().anyMatch(e -> e.contains("wajib")));
    }

    @Test
    @DisplayName("Password shorter than 8 chars should fail")
    void shortPassword_ShouldFail() {
        String password = "Pass1"; // 5 chars

        assertFalse(PasswordValidator.isValid(password));

        List<String> errors = PasswordValidator.getValidationErrors(password);
        assertTrue(errors.stream().anyMatch(e -> e.contains("8")));
    }

    @Test
    @DisplayName("Password without uppercase should fail")
    void noUppercase_ShouldFail() {
        String password = "securepass123";

        assertFalse(PasswordValidator.isValid(password));

        List<String> errors = PasswordValidator.getValidationErrors(password);
        assertTrue(errors.stream().anyMatch(e -> e.contains("huruf besar")));
    }

    @Test
    @DisplayName("Password without lowercase should fail")
    void noLowercase_ShouldFail() {
        String password = "SECUREPASS123";

        assertFalse(PasswordValidator.isValid(password));

        List<String> errors = PasswordValidator.getValidationErrors(password);
        assertTrue(errors.stream().anyMatch(e -> e.contains("huruf kecil")));
    }

    @Test
    @DisplayName("Password without digit should fail")
    void noDigit_ShouldFail() {
        String password = "SecurePassword";

        assertFalse(PasswordValidator.isValid(password));

        List<String> errors = PasswordValidator.getValidationErrors(password);
        assertTrue(errors.stream().anyMatch(e -> e.contains("angka")));
    }

    @Test
    @DisplayName("Password with multiple validation failures should return all errors")
    void multipleFailures_ShouldReturnAllErrors() {
        String password = "abc"; // Too short, no uppercase, no digit

        List<String> errors = PasswordValidator.getValidationErrors(password);

        assertTrue(errors.size() >= 2); // At least short + no digit
    }

    @ParameterizedTest
    @ValueSource(strings = { "Password1", "Abcdefg1", "12345678Aa", "TestPwd99" })
    @DisplayName("Various valid passwords should pass")
    void variousValidPasswords_ShouldPass(String password) {
        assertTrue(PasswordValidator.isValid(password));
    }
}
