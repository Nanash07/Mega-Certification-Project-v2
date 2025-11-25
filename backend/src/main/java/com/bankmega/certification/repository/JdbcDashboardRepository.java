package com.bankmega.certification.repository;

import com.bankmega.certification.dto.dashboard.*;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.*;

@Repository
public class JdbcDashboardRepository implements DashboardRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public JdbcDashboardRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /* ====================== helpers ====================== */

    private void add(MapSqlParameterSource p, String key, Object val) {
        if (val != null)
            p.addValue(key, val);
    }

    private Long toLong(Object o) {
        return o == null ? null : ((Number) o).longValue();
    }

    private Integer toInt(Object o) {
        return o == null ? null : ((Number) o).intValue();
    }

    /** WHERE untuk employee alias (e) */
    private String whereEmployee(String alias, DashboardFilters f, MapSqlParameterSource p) {
        List<String> cond = new ArrayList<>();
        if (f.getRegionalId() != null) {
            add(p, "regionalId", f.getRegionalId());
            cond.add(alias + ".regional_id = :regionalId");
        }
        if (f.getDivisionId() != null) {
            add(p, "divisionId", f.getDivisionId());
            cond.add(alias + ".division_id = :divisionId");
        }
        if (f.getUnitId() != null) {
            add(p, "unitId", f.getUnitId());
            cond.add(alias + ".unit_id = :unitId");
        }
        return cond.isEmpty() ? "" : " AND " + String.join(" AND ", cond);
    }

    /** WHERE untuk certification rule alias (cr) */
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

        // ✅ GUARD SCOPE PIC (WAJIB): batasi ke daftar yg diizinkan
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

    /** versi raw (tanpa "AND ") untuk blok OR */
    private String whereEmployeeRaw(String alias, DashboardFilters f, MapSqlParameterSource p) {
        List<String> cond = new ArrayList<>();
        if (f.getRegionalId() != null) {
            add(p, "regionalId", f.getRegionalId());
            cond.add(alias + ".regional_id = :regionalId");
        }
        if (f.getDivisionId() != null) {
            add(p, "divisionId", f.getDivisionId());
            cond.add(alias + ".division_id = :divisionId");
        }
        if (f.getUnitId() != null) {
            add(p, "unitId", f.getUnitId());
            cond.add(alias + ".unit_id = :unitId");
        }
        return String.join(" AND ", cond);
    }

    private MapSqlParameterSource baseParams(DashboardFilters f) {
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (f.getStartDate() != null) {
            p.addValue("startDate", f.getStartDate());
        }
        if (f.getEndDate() != null) {
            p.addValue("endDate", f.getEndDate());
        }
        if (f.getBatchType() != null) {
            p.addValue("batchType", f.getBatchType());
        }
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

        Map<String, Object> r = jdbc.queryForMap(sql, p);

        return new SummaryCounts(
                ((Number) r.get("employee_count")).longValue(),
                ((Number) r.get("eligible_population")).longValue(),
                ((Number) r.get("certified_count")).longValue(),
                ((Number) r.get("not_yet_count")).longValue(),
                ((Number) r.get("due_count")).longValue(),
                ((Number) r.get("expired_count")).longValue(),
                ((Number) r.get("ongoing_batch_count")).longValue());
    }

    @Override
    public List<MonthlyPoint> fetchMonthly(DashboardFilters f) {
        MapSqlParameterSource p = baseParams(f);
        String ruleWhere = whereRule("cr", f, p);

        StringBuilder dateClause = new StringBuilder();
        if (f.getStartDate() != null) {
            dateClause.append(" AND b.start_date >= :startDate");
        }
        if (f.getEndDate() != null) {
            dateClause.append(" AND b.start_date <= :endDate");
        }

        String typeClause = "";
        if (f.getBatchType() != null) {
            typeClause = " AND b.type = :batchType";
        }

        String sql = """
                SELECT EXTRACT(MONTH FROM b.start_date)::int AS m, COUNT(*) AS c
                FROM batches b
                JOIN certification_rules cr ON cr.id = b.certification_rule_id
                WHERE b.deleted_at IS NULL
                  AND b.status IN ('ONGOING','FINISHED')
                  %s
                  %s
                  %s
                GROUP BY m
                ORDER BY m;
                """.formatted(ruleWhere, dateClause.toString(), typeClause);

        return jdbc.query(sql, p, (rs, i) -> new MonthlyPoint(rs.getInt("m"), rs.getLong("c")));
    }

    @Override
    public List<BatchCard> fetchOngoingBatches(DashboardFilters f) {
        MapSqlParameterSource p = baseParams(f);
        String ruleWhere = whereRule("cr", f, p);
        String empRaw = whereEmployeeRaw("e", f, p);
        String empBlock = empRaw.isEmpty() ? "" : " AND (e.id IS NULL OR (" + empRaw + "))";

        StringBuilder dateClause = new StringBuilder();
        if (f.getStartDate() != null) {
            dateClause.append(" AND b.start_date >= :startDate");
        }
        if (f.getEndDate() != null) {
            dateClause.append(" AND b.start_date <= :endDate");
        }

        String sql = """
                SELECT b.id, b.batch_name, b.type, b.status, b.start_date, b.end_date, b.quota,
                       COALESCE(SUM(CASE WHEN eb.status IN ('REGISTERED','ATTENDED') THEN 1 END),0) AS onrun,
                       COALESCE(SUM(CASE WHEN eb.status = 'PASSED' THEN 1 END),0)                 AS passed,
                       COALESCE(SUM(CASE WHEN eb.status = 'FAILED' THEN 1 END),0)                 AS failed,
                       c.code  AS certification_code,
                       cl.level AS certification_level_level,
                       sf.code  AS sub_field_code
                FROM batches b
                JOIN certification_rules cr   ON cr.id = b.certification_rule_id
                LEFT JOIN certifications c        ON c.id  = cr.certification_id
                LEFT JOIN certification_levels cl ON cl.id = cr.certification_level_id
                LEFT JOIN sub_fields sf           ON sf.id = cr.sub_field_id
                LEFT JOIN employee_batches eb ON eb.batch_id = b.id
                LEFT JOIN employees e        ON e.id = eb.employee_id
                WHERE b.status = 'ONGOING'
                  %s
                  %s
                  %s
                GROUP BY b.id, b.batch_name, b.type, b.status, b.start_date, b.end_date, b.quota,
                         c.code, cl.level, sf.code
                ORDER BY b.start_date DESC, b.id DESC
                LIMIT 10;
                """.formatted(ruleWhere, empBlock, dateClause.toString());

        return jdbc.query(sql, p, (rs, i) -> new BatchCard(
                rs.getLong("id"),
                rs.getString("batch_name"),
                rs.getString("type"),
                rs.getString("status"),
                rs.getDate("start_date") == null ? null : rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date") == null ? null : rs.getDate("end_date").toLocalDate(),
                toInt(rs.getObject("quota")),
                rs.getInt("onrun"),
                rs.getInt("passed"),
                rs.getInt("failed"),
                rs.getString("certification_code"),
                toInt(rs.getObject("certification_level_level")),
                rs.getString("sub_field_code")));
    }

    @Override
    public Map<String, List<PriorityRow>> fetchPriorityTop10(DashboardFilters f) {
        MapSqlParameterSource p = baseParams(f);
        String empWhere = whereEmployee("e", f, p);
        String ruleWhere = whereRule("cr", f, p);

        String base = """
                SELECT
                    e.nip,
                    e.name,
                    c.code  AS certification_code,
                    cl.level AS rule_level,
                    sf.code  AS sub_field_code,
                    CONCAT_WS('-', c.code, cl.level::text, sf.code) AS rule_code,
                    elg.status,
                    elg.due_date AS valid_until,
                    (elg.due_date - CURRENT_DATE) AS days_left
                FROM employee_eligibilities elg
                JOIN employees e            ON e.id = elg.employee_id AND e.deleted_at IS NULL
                JOIN certification_rules cr ON cr.id = elg.certification_rule_id
                LEFT JOIN certifications c        ON c.id  = cr.certification_id
                LEFT JOIN certification_levels cl ON cl.id = cr.certification_level_id
                LEFT JOIN sub_fields sf           ON sf.id = cr.sub_field_id
                WHERE elg.deleted_at IS NULL
                  %s
                  %s
                  AND elg.status = :wantedStatus
                ORDER BY %s;
                """;

        Map<String, List<PriorityRow>> out = new HashMap<>();

        // NOT_YET_CERTIFIED (Belum memiliki sertifikat) → urut nama
        p.addValue("wantedStatus", "NOT_YET_CERTIFIED");
        String notYetSql = base.formatted(empWhere, ruleWhere, "e.name ASC");
        List<PriorityRow> notYet = jdbc.query(notYetSql, p, (rs, i) -> new PriorityRow(
                rs.getString("nip"),
                rs.getString("name"),
                rs.getString("rule_code"),
                "NOT_YET_CERTIFIED",
                rs.getDate("valid_until") == null ? null : rs.getDate("valid_until").toLocalDate(),
                toLong(rs.getObject("days_left"))));
        out.put("notYet", notYet);

        // DUE → paling dekat dulu
        MapSqlParameterSource p2 = new MapSqlParameterSource(p.getValues());
        p2.addValue("wantedStatus", "DUE");
        String dueSql = base.formatted(empWhere, ruleWhere, "elg.due_date ASC NULLS LAST");
        List<PriorityRow> due = jdbc.query(dueSql, p2, (rs, i) -> new PriorityRow(
                rs.getString("nip"),
                rs.getString("name"),
                rs.getString("rule_code"),
                "DUE",
                rs.getDate("valid_until") == null ? null : rs.getDate("valid_until").toLocalDate(),
                toLong(rs.getObject("days_left"))));
        out.put("due", due);

        // EXPIRED → paling lama expired dulu
        MapSqlParameterSource p3 = new MapSqlParameterSource(p.getValues());
        p3.addValue("wantedStatus", "EXPIRED");
        String expSql = base.formatted(empWhere, ruleWhere, "elg.due_date DESC NULLS LAST");
        List<PriorityRow> expired = jdbc.query(expSql, p3, (rs, i) -> new PriorityRow(
                rs.getString("nip"),
                rs.getString("name"),
                rs.getString("rule_code"),
                "EXPIRED",
                rs.getDate("valid_until") == null ? null : rs.getDate("valid_until").toLocalDate(),
                toLong(rs.getObject("days_left"))));
        out.put("expired", expired);

        return out;
    }

    @Override
    public FiltersResponse fetchFilterOptions() {
        String opt = "SELECT id, name FROM %s ORDER BY name ASC";
        List<FilterOption> regionals = jdbc.query(opt.formatted("regionals"),
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));
        List<FilterOption> divisions = jdbc.query(opt.formatted("divisions"),
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));
        List<FilterOption> units = jdbc.query(opt.formatted("units"),
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));
        List<FilterOption> certs = jdbc.query(opt.formatted("certifications"),
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));
        List<FilterOption> levels = jdbc.query(
                "SELECT id, ('L' || level)::text AS name FROM certification_levels ORDER BY level",
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));
        List<FilterOption> subs = jdbc.query(opt.formatted("sub_fields"),
                (rs, i) -> new FilterOption(rs.getLong("id"), rs.getString("name")));

        return new FiltersResponse(regionals, divisions, units, certs, levels, subs);
    }
}
