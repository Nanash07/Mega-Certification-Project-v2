package com.bankmega.certification.listener;

import com.bankmega.certification.event.EmployeeCertificationChangedEvent;
import com.bankmega.certification.service.EmployeeEligibilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
@RequiredArgsConstructor
public class EmployeeCertificationChangedListener {

    private final EmployeeEligibilityService employeeEligibilityService;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handle(EmployeeCertificationChangedEvent event) {
        Long employeeId = event.employeeId();
        if (employeeId != null) {
            employeeEligibilityService.refreshEligibilityForEmployee(employeeId);
        }
    }
}
