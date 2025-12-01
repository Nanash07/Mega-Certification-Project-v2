package com.bankmega.certification.service;

import com.bankmega.certification.dto.dashboard.*;
import com.bankmega.certification.repository.DashboardRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private final DashboardRepository repo;

    public DashboardService(DashboardRepository repo) {
        this.repo = repo;
    }

    public SummaryDTO getSummary(DashboardFilters f) {
        DashboardFilters fx = ensureFilters(f);
        SummaryCounts c = repo.fetchSummaryCounts(fx);
        double pct = c.getEligiblePopulation() == 0 ? 0.0
                : (c.getCertifiedCount() * 100.0 / c.getEligiblePopulation());
        double pct1dp = Math.round(pct * 10.0) / 10.0;
        return SummaryDTO.builder()
                .employeeCount(c.getEmployeeCount())
                .eligiblePopulation(c.getEligiblePopulation())
                .certifiedCount(c.getCertifiedCount())
                .notYetCount(c.getNotYetCount())
                .dueCount(c.getDueCount())
                .expiredCount(c.getExpiredCount())
                .ongoingBatchCount(c.getOngoingBatchCount())
                .realizationPct(pct1dp)
                .build();
    }

    public List<MonthlyPoint> getMonthly(DashboardFilters f) {
        return repo.fetchMonthly(ensureFilters(f));
    }

    private DashboardFilters ensureFilters(DashboardFilters f) {
        return f == null
                ? DashboardFilters.builder().build()
                : f;
    }
}
