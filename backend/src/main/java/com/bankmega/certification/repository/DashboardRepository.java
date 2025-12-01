package com.bankmega.certification.repository;

import java.util.List;

import com.bankmega.certification.dto.dashboard.DashboardFilters;
import com.bankmega.certification.dto.dashboard.MonthlyPoint;
import com.bankmega.certification.dto.dashboard.SummaryCounts;

public interface DashboardRepository {
    SummaryCounts fetchSummaryCounts(DashboardFilters f);

    List<MonthlyPoint> fetchMonthly(DashboardFilters f);
}
