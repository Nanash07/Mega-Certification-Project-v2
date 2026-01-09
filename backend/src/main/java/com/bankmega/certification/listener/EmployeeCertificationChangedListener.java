package com.bankmega.certification.listener;

import com.bankmega.certification.event.EmployeeCertificationChangedEvent;
import com.bankmega.certification.service.EmployeeEligibilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmployeeCertificationChangedListener {

    private final EmployeeEligibilityService employeeEligibilityService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handle(EmployeeCertificationChangedEvent event) {
        Long employeeId = event.employeeId();
        if (employeeId != null) {
            try {
                log.info("Refreshing eligibility for employee {} after certification change", employeeId);
                employeeEligibilityService.refreshEligibilityForEmployee(employeeId);
                log.info("Eligibility refreshed successfully for employee {}", employeeId);
            } catch (Exception e) {
                log.error("Failed to refresh eligibility for employee {}: {}", employeeId, e.getMessage(), e);
            }
        }
    }
}
