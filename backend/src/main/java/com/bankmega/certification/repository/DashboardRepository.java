package com.bankmega.certification.repository;

import java.util.List;
import java.util.Map;

import com.bankmega.certification.dto.dashboard.BatchCard;
import com.bankmega.certification.dto.dashboard.DashboardFilters;
import com.bankmega.certification.dto.dashboard.FiltersResponse;
import com.bankmega.certification.dto.dashboard.MonthlyPoint;
import com.bankmega.certification.dto.dashboard.PriorityRow;
import com.bankmega.certification.dto.dashboard.SummaryCounts;

public interface DashboardRepository {
    SummaryCounts fetchSummaryCounts(DashboardFilters f);

    List<MonthlyPoint> fetchMonthly(DashboardFilters f);

    List<BatchCard> fetchOngoingBatches(DashboardFilters f);

    Map<String, List<PriorityRow>> fetchPriorityTop10(DashboardFilters f);

    FiltersResponse fetchFilterOptions();
}
