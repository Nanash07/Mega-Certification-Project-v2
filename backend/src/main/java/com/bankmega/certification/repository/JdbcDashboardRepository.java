// src/main/java/com/bankmega/certification/repository/JdbcDashboardRepository.java
package com.bankmega.certification.repository;

import com.bankmega.certification.dto.dashboard.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
public class JdbcDashboardRepository implements DashboardRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public JdbcDashboardRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /* ====================== helpers ====================== */

    private void add(MapSqlParameterSource p, String key, Object val) {
        if (val != null) {
            p.addValue(java.util.Objects.requireNonNull(key), val);
        }
    }

    private String whereEmployee(String alias, DashboardFilters f, MapSqlParameterSource p) {
        List<String> cond = new ArrayList<>();

        // 🔹 scope khusus dashboard pegawai
        if (f.getEmployeeId() != null) {
            add(p, "employeeId", f.getEmployeeId());
            cond.add(alias + ".id = :employeeId");
        }

        // Filter by regional - query dari positions
        if (f.getRegionalId() != null) {
            add(p, "regionalId", f.getRegionalId());
            cond.add("EXISTS (SELECT 1 FROM employee_positions ep WHERE ep.employee_id = "
                    + alias + ".id AND ep.regional_id = :regionalId AND ep.deleted_at IS NULL)");
        }
        // Filter by division - query dari positions
        if (f.getDivisionId() != null) {
            add(p, "divisionId", f.getDivisionId());
            cond.add("EXISTS (SELECT 1 FROM employee_positions ep WHERE ep.employee_id = "
                    + alias + ".id AND ep.division_id = :divisionId AND ep.deleted_at IS NULL)");
        }
        // Filter by unit - query dari positions
        if (f.getUnitId() != null) {
            add(p, "unitId", f.getUnitId());
            cond.add("EXISTS (SELECT 1 FROM employee_positions ep WHERE ep.employee_id = "
                    + alias + ".id AND ep.unit_id = :unitId AND ep.deleted_at IS NULL)");
        }
        return cond.isEmpty() ? "" : " AND " + String.join(" AND ", cond);
    }

    private String whereRule(String alias, DashboardFilters f, MapSqlParameterSource p) {
        List<String> cond = new ArrayList<>();
        if (f.getCertificationId() != null) {
            add(p, "certificationId", f.getCertificationId());
            cond.add(alias + ".certification_id = :certificationId");
        }
        if (f.getLevelId() != null) {
            add(p, "levelId", f.getLevelId());
            cond.add(alias + ".certification_level_id = :levelId");
        }
        if (f.getSubFieldId() != null) {
            add(p, "subFieldId", f.getSubFieldId());
            cond.add(alias + ".sub_field_id = :subFieldId");
        }

        if (f.getAllowedCertificationIds() != null) {
            List<Long> allowed = f.getAllowedCertificationIds();
            if (allowed.isEmpty()) {
                // kalau sudah di-set kosong/sentinel → hasil harus nihil
                cond.add("1=0");
            } else {
                add(p, "allowedCertIds", allowed);
                cond.add(alias + ".certification_id IN (:allowedCertIds)");
            }
        }

        return cond.isEmpty() ? "" : " AND " + String.join(" AND ", cond);
    }

    private MapSqlParameterSource baseParams(DashboardFilters f) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (f.getStartDate() != null) {
            p.addValue("startDate", f.getStartDate());
        }
        if (f.getEndDate() != null) {
            p.addValue("endDate", f.getEndDate());
        }
        // batchType sudah tidak dipakai lagi
        return p;
    }

    /* ====================== queries ====================== */

    @Override
    public SummaryCounts fetchSummaryCounts(DashboardFilters f) {
        MapSqlParameterSource p = baseParams(f);
        String empWhere = whereEmployee("e", f, p);
        String ruleWhere = whereRule("cr", f, p);

        String sql = """
                WITH latest_ec AS (
                  SELECT DISTINCT ON (ec.employee_id, ec.certification_rule_id)
                         ec.employee_id, ec.certification_rule_id, ec.status
                  FROM employee_certifications ec
                  WHERE ec.deleted_at IS NULL
                  ORDER BY ec.employee_id, ec.certification_rule_id, COALESCE(ec.updated_at, ec.created_at) DESC
                ),
                scoped_emp AS (
                  SELECT e.id
                  FROM employees e
                  WHERE e.deleted_at IS NULL
                  %s
                ),
                scoped_elg AS (
                  SELECT elg.employee_id, elg.certification_rule_id
                  FROM employee_eligibilities elg
                  JOIN scoped_emp se ON se.id = elg.employee_id
                  JOIN certification_rules cr ON cr.id = elg.certification_rule_id
                  WHERE elg.deleted_at IS NULL
                    AND (elg.is_active IS TRUE OR elg.is_active IS NULL)
                  %s
                ),
                joined AS (
                  SELECT elg.employee_id, elg.certification_rule_id, lec.status
                  FROM scoped_elg elg
                  LEFT JOIN latest_ec lec
                    ON lec.employee_id = elg.employee_id
                   AND lec.certification_rule_id = elg.certification_rule_id
                )
                SELECT
                  (SELECT COUNT(*) FROM scoped_emp) AS employee_count,
                  (SELECT COUNT(*) FROM scoped_elg) AS eligible_population,

                  COUNT(CASE WHEN j.status IN ('ACTIVE','DUE') THEN 1 END) AS certified_count,

                  COUNT(CASE WHEN j.status IS NULL OR j.status = 'NOT_YET_CERTIFIED' THEN 1 END) AS not_yet_count,

                  (SELECT COUNT(*)
                     FROM latest_ec lec
                     JOIN scoped_emp se ON se.id = lec.employee_id
                     JOIN certification_rules cr ON cr.id = lec.certification_rule_id
                    WHERE 1=1
                      %s
                      AND lec.status = 'DUE'
                  ) AS due_count,

                  (SELECT COUNT(*)
                     FROM latest_ec lec
                     JOIN scoped_emp se ON se.id = lec.employee_id
                     JOIN certification_rules cr ON cr.id = lec.certification_rule_id
                    WHERE 1=1
                      %s
                      AND lec.status = 'EXPIRED'
                  ) AS expired_count,

                  (SELECT COUNT(*)
                     FROM batches b
                     JOIN certification_rules cr ON cr.id = b.certification_rule_id
                    WHERE b.status = 'ONGOING'
                      %s
                  ) AS ongoing_batch_count
                FROM joined j;
                """.formatted(empWhere, ruleWhere, ruleWhere, ruleWhere, ruleWhere);

        Map<String, Object> r = jdbc.queryForMap(java.util.Objects.requireNonNull(sql),
                java.util.Objects.requireNonNull(p));

        return new SummaryCounts(
                ((Number) r.get("employee_count")).longValue(),
                ((Number) r.get("eligible_population")).longValue(),
                ((Number) r.get("certified_count")).longValue(),
                ((Number) r.get("not_yet_count")).longValue(),
                ((Number) r.get("due_count")).longValue(),
                ((Number) r.get("expired_count")).longValue(),
                ((Number) r.get("ongoing_batch_count")).longValue());
    }

}
