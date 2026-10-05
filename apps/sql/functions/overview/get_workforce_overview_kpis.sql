DROP FUNCTION IF EXISTS public.get_workforce_kpis(DATE);
DROP FUNCTION IF EXISTS public.get_workforce_kpis(DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_workforce_kpis(DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_workforce_kpis(
    p_as_of_date DATE DEFAULT CURRENT_DATE,
    p_function TEXT DEFAULT NULL,
    p_organizational_unit TEXT DEFAULT NULL,
    p_range TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_gender_key TEXT DEFAULT NULL,
    p_direct_or_indirect TEXT DEFAULT NULL,
    p_account_id UUID DEFAULT NULL,
    p_reporting_month DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
    IF p_as_of_date IS NULL OR NOT ISFINITE(p_as_of_date) THEN
        RAISE EXCEPTION 'A valid calculation date is required';
    END IF;

    IF p_account_id IS NULL THEN
        RAISE EXCEPTION 'An authenticated account is required';
    END IF;

    IF p_reporting_month IS NOT NULL
       AND EXTRACT(DAY FROM p_reporting_month) <> 1 THEN
        RAISE EXCEPTION 'Reporting month must be the first day of a month';
    END IF;

    RETURN (
        WITH settings AS (
            SELECT
                p_as_of_date AS as_of_date,
                'Female'::TEXT AS female_value,
                'D'::TEXT AS direct_value,
                'I'::TEXT AS indirect_value
        ),

        namelist_source AS (
            SELECT
                e.pers_no, e.gender_key, e.direct_or_indirect,
                e.entry_for_retirement, e.birth_date, e.joining_date,
                e.range, e.organizational_unit, e.function, e.location
            FROM public.employee_namelist e
            WHERE p_reporting_month IS NULL

            UNION ALL

            SELECT
                e.pers_no, e.gender_key, e.direct_or_indirect,
                e.entry_for_retirement, e.birth_date, e.joining_date,
                e.range, e.organizational_unit, e.function, e.location
            FROM public.employee_namelist_monthly e
            WHERE p_reporting_month IS NOT NULL
              AND e.reporting_month = p_reporting_month
        ),

        prepared AS (
            SELECT
                e.gender_key,
                e.direct_or_indirect,
                e.entry_for_retirement,
                s.as_of_date,
                s.female_value,
                s.direct_value,
                s.indirect_value,

                CASE
                    WHEN ISFINITE(e.birth_date)
                         AND e.birth_date <= s.as_of_date
                    THEN s.as_of_date - e.birth_date
                END AS age_days,

                CASE
                    WHEN ISFINITE(e.joining_date)
                         AND e.joining_date <= s.as_of_date
                    THEN s.as_of_date - e.joining_date
                END AS tenure_days

            FROM namelist_source e
            CROSS JOIN settings s

                        WHERE EXISTS (
                                    SELECT 1
                                    FROM public.master_access access
                                    WHERE access.account_id = p_account_id
                                        AND (
                                            access.role IN ('hrbp', 'admin')
                                            OR (access.role = 'range_head'
                                                AND BTRIM(e.range) = BTRIM(access.assigned_range))
                                            OR (access.role IN ('department_head', 'sub_department_head')
                                                AND BTRIM(e.range) = BTRIM(access.assigned_range)
                                                AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))
                                        )
                            )
                            AND (p_function IS NULL
                  OR BTRIM(e.function) = p_function)
              AND (p_organizational_unit IS NULL
                  OR BTRIM(e.organizational_unit) = p_organizational_unit)
              AND (p_range IS NULL
                  OR BTRIM(e.range) = p_range)
              AND (p_location IS NULL
                  OR BTRIM(e.location) = p_location)
              AND (p_gender_key IS NULL
                  OR BTRIM(e.gender_key) = p_gender_key)
              AND (p_direct_or_indirect IS NULL
                  OR BTRIM(e.direct_or_indirect) = p_direct_or_indirect)
        ),

        metrics AS (
            SELECT
                COUNT(*) AS total_hc,

                COUNT(*) FILTER (
                    WHERE LOWER(BTRIM(direct_or_indirect)) =
                          LOWER(direct_value)
                ) AS direct_hc,

                COUNT(*) FILTER (
                    WHERE LOWER(BTRIM(direct_or_indirect)) =
                          LOWER(indirect_value)
                ) AS indirect_hc,

                COUNT(*) FILTER (
                    WHERE LOWER(BTRIM(gender_key)) =
                          LOWER(female_value)
                ) AS female_hc,

                COUNT(*) FILTER (
                    WHERE NULLIF(BTRIM(gender_key), '') IS NULL
                ) AS missing_gender_hc,

                COUNT(age_days) AS valid_birth_date_count,
                SUM(age_days) AS total_age_days,

                COUNT(tenure_days) AS valid_joining_date_count,
                SUM(tenure_days) AS total_tenure_days,

                COUNT(*) FILTER (
                    WHERE ISFINITE(entry_for_retirement)
                      AND entry_for_retirement >= as_of_date
                      AND entry_for_retirement <
                          as_of_date + INTERVAL '3 years'
                ) AS retirement_lt_3_years,

                COUNT(*) FILTER (
                    WHERE entry_for_retirement IS NULL
                       OR NOT ISFINITE(entry_for_retirement)
                ) AS missing_or_invalid_retirement_dates,

                COUNT(*) FILTER (
                    WHERE ISFINITE(entry_for_retirement)
                      AND entry_for_retirement < as_of_date
                ) AS past_retirement_dates,

                COUNT(*) FILTER (
                    WHERE ISFINITE(entry_for_retirement)
                      AND entry_for_retirement >=
                          as_of_date + INTERVAL '3 years'
                ) AS retirement_at_or_after_3_years

            FROM prepared
        ),

        status_metrics AS (
            SELECT
                COUNT(*) FILTER (
                    WHERE status_type = 'Maternity'
                ) AS maternity_hc,

                COUNT(*) FILTER (
                    WHERE status_type = 'Sabbatical'
                ) AS sabbatical_hc,

                COUNT(*) FILTER (
                    WHERE status_type = 'CRL'
                ) AS crl_hc,

                COUNT(*) AS active_status_hc

            FROM public.employee_status es
            INNER JOIN namelist_source e
                ON e.pers_no = es.pers_no
                        WHERE EXISTS (
                                    SELECT 1
                                    FROM public.master_access access
                                    WHERE access.account_id = p_account_id
                                        AND (
                                            access.role IN ('hrbp', 'admin')
                                            OR (access.role = 'range_head'
                                                AND BTRIM(e.range) = BTRIM(access.assigned_range))
                                            OR (access.role IN ('department_head', 'sub_department_head')
                                                AND BTRIM(e.range) = BTRIM(access.assigned_range)
                                                AND BTRIM(e.organizational_unit) = BTRIM(access.assigned_org_unit))
                                        )
                            )
                              AND (p_function IS NULL
                  OR BTRIM(e.function) = p_function)
              AND (p_organizational_unit IS NULL
                  OR BTRIM(e.organizational_unit) = p_organizational_unit)
              AND (p_range IS NULL
                  OR BTRIM(e.range) = p_range)
              AND (p_location IS NULL
                  OR BTRIM(e.location) = p_location)
              AND (p_gender_key IS NULL
                  OR BTRIM(e.gender_key) = p_gender_key)
              AND (p_direct_or_indirect IS NULL
                  OR BTRIM(e.direct_or_indirect) = p_direct_or_indirect)
        )

        SELECT JSONB_BUILD_OBJECT(
            'as_of_date', s.as_of_date,

            'total_hc', JSONB_BUILD_OBJECT(
                'value', m.total_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'table', CASE
                        WHEN p_reporting_month IS NULL THEN 'employee_namelist'
                        ELSE 'employee_namelist_monthly'
                    END,
                    'employee_rows', m.total_hc,
                    'direct_plus_indirect',
                        m.direct_hc + m.indirect_hc,
                    'headcount_matches',
                        m.total_hc = m.direct_hc + m.indirect_hc
                ),
                'formula', 'Count all employee rows'
            ),

            'direct_hc', JSONB_BUILD_OBJECT(
                'value', m.direct_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'direct_or_indirect',
                    'matching_value', s.direct_value,
                    'matched_rows', m.direct_hc,
                    'total_hc', m.total_hc
                ),
                'formula', 'Count rows where Direct/Indirect = D'
            ),

            'indirect_hc', JSONB_BUILD_OBJECT(
                'value', m.indirect_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'direct_or_indirect',
                    'matching_value', s.indirect_value,
                    'matched_rows', m.indirect_hc,
                    'total_hc', m.total_hc
                ),
                'formula', 'Count rows where Direct/Indirect = I'
            ),

            'female_pct', JSONB_BUILD_OBJECT(
                'value', ROUND(
                    100.0 * m.female_hc / NULLIF(m.total_hc, 0),
                    1
                ),
                'unit', '%',
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'gender_key',
                    'matching_value', s.female_value,
                    'female_hc', m.female_hc,
                    'total_hc', m.total_hc,
                    'missing_gender_hc', m.missing_gender_hc
                ),
                'formula', 'female_hc / total_hc * 100'
            ),

            'avg_age', JSONB_BUILD_OBJECT(
                'value', ROUND(
                    m.total_age_days::NUMERIC
                    / NULLIF(m.valid_birth_date_count, 0)
                    / 365.2425,
                    1
                ),
                'unit', 'years',
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'birth_date',
                    'calculation_date', s.as_of_date,
                    'total_age_days', m.total_age_days,
                    'included_employees', m.valid_birth_date_count,
                    'excluded_employees',
                        m.total_hc - m.valid_birth_date_count,
                    'days_per_year', 365.2425
                ),
                'formula',
                    'total_age_days / included_employees / days_per_year'
            ),

            'avg_tenure', JSONB_BUILD_OBJECT(
                'value', ROUND(
                    m.total_tenure_days::NUMERIC
                    / NULLIF(m.valid_joining_date_count, 0)
                    / 365.2425,
                    1
                ),
                'unit', 'years',
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'joining_date',
                    'calculation_date', s.as_of_date,
                    'total_tenure_days', m.total_tenure_days,
                    'included_employees', m.valid_joining_date_count,
                    'excluded_employees',
                        m.total_hc - m.valid_joining_date_count,
                    'days_per_year', 365.2425
                ),
                'formula',
                    'total_tenure_days / included_employees / days_per_year'
            ),

            'retirement_lt_3_years', JSONB_BUILD_OBJECT(
                'value', m.retirement_lt_3_years,
                'inputs', JSONB_BUILD_OBJECT(
                    'column', 'entry_for_retirement',
                    'start_date_inclusive', s.as_of_date,
                    'end_date_exclusive',
                        (s.as_of_date + INTERVAL '3 years')::DATE,
                    'matched_employees', m.retirement_lt_3_years,
                    'past_retirement_dates', m.past_retirement_dates,
                    'at_or_after_3_years',
                        m.retirement_at_or_after_3_years,
                    'missing_or_invalid_dates',
                        m.missing_or_invalid_retirement_dates
                ),
                'formula',
                    'Count retirement dates >= start date and < end date'
            ),

            'attrition_ytd', JSONB_BUILD_OBJECT(
                'value', NULL,
                'status', 'unavailable',
                'inputs', JSONB_BUILD_OBJECT(
                    'eligible_ytd_exits', NULL,
                    'average_headcount_for_period', NULL
                ),
                'formula', NULL,
                'reason',
                    'Needs exit records, historical headcount and an agreed attrition definition'
            ),

            'maternity', JSONB_BUILD_OBJECT(
                'value', sm.maternity_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'table', 'employee_status',
                    'matching_value', 'Maternity',
                    'employees_on_maternity_leave', sm.maternity_hc,
                    'calculation_date', s.as_of_date,
                    'active_status_records', sm.active_status_hc
                ),
                'formula',
                    'Count active employee_status rows where status_type = Maternity'
            ),

            'sabbatical', JSONB_BUILD_OBJECT(
                'value', sm.sabbatical_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'table', 'employee_status',
                    'matching_value', 'Sabbatical',
                    'employees_on_sabbatical', sm.sabbatical_hc,
                    'calculation_date', s.as_of_date,
                    'active_status_records', sm.active_status_hc
                ),
                'formula',
                    'Count active employee_status rows where status_type = Sabbatical'
            ),

            'crl', JSONB_BUILD_OBJECT(
                'value', sm.crl_hc,
                'inputs', JSONB_BUILD_OBJECT(
                    'table', 'employee_status',
                    'matching_value', 'CRL',
                    'eligible_employees', sm.crl_hc,
                    'calculation_date', s.as_of_date,
                    'active_status_records', sm.active_status_hc
                ),
                'formula',
                    'Count active employee_status rows where status_type = CRL'
            )
        )

        FROM metrics m
        CROSS JOIN settings s
        CROSS JOIN status_metrics sm
    );
END;
$$;