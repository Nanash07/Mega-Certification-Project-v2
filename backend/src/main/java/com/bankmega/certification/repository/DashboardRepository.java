package com.bankmega.certification.repository;

import com.bankmega.certification.dto.dashboard.DashboardFilters;
import com.bankmega.certification.dto.dashboard.SummaryCounts;

public interface DashboardRepository {
    SummaryCounts fetchSummaryCounts(DashboardFilters f);
}
