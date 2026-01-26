package com.bankmega.certification;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Integration test that loads full Spring context.
 * Requires database connection - disabled for unit test suite.
 * Enable manually for integration testing with proper test DB.
 */
@Disabled("Requires database connection - enable for integration testing only")
@SpringBootTest
class CertificationApplicationTests {

	@Test
	void contextLoads() {
		// This test verifies that Spring context loads correctly
	}

}
