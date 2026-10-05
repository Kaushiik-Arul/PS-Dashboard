DROP FUNCTION IF EXISTS public.get_workforce_charts(DATE);
DROP FUNCTION IF EXISTS public.get_workforce_charts(DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_workforce_charts(DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.get_workforce_charts(
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
        WITH namelist_source AS (
            SELECT
                e.ps_group, e.gender_key, e.function, e.location,
                e.employee_group, e.birth_date, e.joining_date,
                e.entry_for_retirement, e.range, e.organizational_unit,
                e.direct_or_indirect
            FROM public.employee_namelist e
            WHERE p_reporting_month IS NULL

            UNION ALL

            SELECT
                e.ps_group, e.gender_key, e.function, e.location,
                e.employee_group, e.birth_date, e.joining_date,
                e.entry_for_retirement, e.range, e.organizational_unit,
                e.direct_or_indirect
            FROM public.employee_namelist_monthly e
            WHERE p_reporting_month IS NOT NULL
              AND e.reporting_month = p_reporting_month
        ),

        base AS (
            SELECT
                NULLIF(BTRIM(e.ps_group), '') AS ps_group_name,
                NULLIF(BTRIM(e.gender_key), '') AS gender_name,
                NULLIF(BTRIM(e.function), '') AS function_name,
                NULLIF(BTRIM(e.location), '') AS location_name,
                NULLIF(BTRIM(e.employee_group), '') AS employee_group_name,

                CASE
                    WHEN ISFINITE(e.birth_date)
                         AND e.birth_date <= p_as_of_date
                    THEN e.birth_date
                END AS birth_date,

                CASE
                    WHEN ISFINITE(e.joining_date)
                         AND e.joining_date <= p_as_of_date
                    THEN e.joining_date
                END AS joining_date,

                CASE
                    WHEN ISFINITE(e.entry_for_retirement)
                    THEN e.entry_for_retirement
                END AS retirement_date

            FROM namelist_source e

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

        employees AS (
            SELECT
                b.*,

                EXTRACT(
                    YEAR FROM AGE(
                        p_as_of_date::TIMESTAMP,
                        b.birth_date::TIMESTAMP
                    )
                )::INTEGER AS age_years,

                EXTRACT(
                    YEAR FROM AGE(
                        p_as_of_date::TIMESTAMP,
                        b.joining_date::TIMESTAMP
                    )
                )::INTEGER AS tenure_years,

                b.retirement_date >= p_as_of_date
                AND b.retirement_date <
                    p_as_of_date + INTERVAL '1 year'
                    AS retires_lt_1_year,

                b.retirement_date >= p_as_of_date
                AND b.retirement_date <
                    p_as_of_date + INTERVAL '3 years'
                    AS retires_lt_3_years,

                b.retirement_date >= p_as_of_date
                AND b.retirement_date <
                    p_as_of_date + INTERVAL '5 years'
                    AS retires_lt_5_years

            FROM base b
        ),

        totals AS (
            SELECT
                COUNT(*) AS total_hc,

                COUNT(*) FILTER (
                    WHERE retires_lt_1_year
                ) AS retirement_lt_1_year,

                COUNT(*) FILTER (
                    WHERE retires_lt_3_years
                ) AS retirement_lt_3_years,

                COUNT(*) FILTER (
                    WHERE retires_lt_5_years
                ) AS retirement_lt_5_years,

                COUNT(*) FILTER (
                    WHERE retirement_date IS NULL
                ) AS missing_or_invalid_retirement_dates,

                COUNT(*) FILTER (
                    WHERE retirement_date < p_as_of_date
                ) AS past_retirement_dates,

                COUNT(*) FILTER (
                    WHERE retirement_date >=
                          p_as_of_date + INTERVAL '5 years'
                ) AS retirement_at_or_after_5_years

            FROM employees
        ),

        -- Movement categories come directly from Employee Group.
        -- No joining-date filter is applied.
        movement_counts AS (
            SELECT
                employee_group_name AS label,
                COUNT(*) AS headcount
            FROM employees
            WHERE employee_group_name IS NOT NULL
            GROUP BY employee_group_name
        ),

        movement_stats AS (
            SELECT
                COALESCE(SUM(headcount), 0) AS grouped_hc,
                COALESCE(MAX(headcount), 0) AS max_headcount
            FROM movement_counts
        ),

        -- Category names come directly from the stored columns.
        dimension_counts AS (
            SELECT
                d.chart,
                d.label,
                0 AS sort_order,
                COUNT(*) AS headcount

            FROM employees e
            CROSS JOIN LATERAL (
                VALUES
                    ('headcount_by_ps_group', e.ps_group_name),
                    ('gender_distribution', e.gender_name),
                    ('headcount_by_function', e.function_name),
                    ('headcount_by_location', e.location_name)
            ) AS d(chart, label)

            WHERE d.label IS NOT NULL
            GROUP BY d.chart, d.label
        ),

        -- Fixed calculation bands with dynamic employee counts.
        profile_bands AS (
            SELECT *
            FROM (
                VALUES
                    ('age_profile', 1, '< 30',   0, 29),
                    ('age_profile', 2, '30-35', 30, 35),
                    ('age_profile', 3, '36-40', 36, 40),
                    ('age_profile', 4, '41-45', 41, 45),
                    ('age_profile', 5, '46-50', 46, 50),
                    ('age_profile', 6, '51-55', 51, 55),
                    ('age_profile', 7, '56+',   56, NULL),

                    ('tenure_profile', 1, '0-2 yrs',    0,  2),
                    ('tenure_profile', 2, '3-5 yrs',    3,  5),
                    ('tenure_profile', 3, '6-10 yrs',   6, 10),
                    ('tenure_profile', 4, '11-20 yrs', 11, 20),
                    ('tenure_profile', 5, '21+ yrs',   21, NULL)
            ) AS v(
                chart,
                sort_order,
                label,
                lower_bound,
                upper_bound
            )
        ),

        profile_values AS (
            SELECT
                'age_profile' AS chart,
                age_years AS completed_years
            FROM employees

            UNION ALL

            SELECT
                'tenure_profile',
                tenure_years
            FROM employees
        ),

        -- Keep all defined bands, including those with zero employees.
        profile_counts AS (
            SELECT
                b.chart,
                b.label,
                b.sort_order,
                COUNT(v.completed_years) AS headcount

            FROM profile_bands b
            LEFT JOIN profile_values v
                ON v.chart = b.chart
                AND v.completed_years >= b.lower_bound
                AND (
                    b.upper_bound IS NULL
                    OR v.completed_years <= b.upper_bound
                )

            GROUP BY b.chart, b.label, b.sort_order
        ),

        chart_counts AS (
            SELECT * FROM dimension_counts

            UNION ALL

            SELECT * FROM profile_counts
        ),

        chart_definitions AS (
            SELECT *
            FROM (
                VALUES
                    (
                        'headcount_by_ps_group',
                        'ps_group',
                        'Count employees grouped by PS group'
                    ),
                    (
                        'gender_distribution',
                        'gender_key',
                        'Count employees grouped by gender'
                    ),
                    (
                        'headcount_by_function',
                        'function',
                        'Count employees grouped by function'
                    ),
                    (
                        'headcount_by_location',
                        'location',
                        'Count employees grouped by location'
                    ),
                    (
                        'age_profile',
                        'birth_date',
                        'Count employees by completed age in years'
                    ),
                    (
                        'tenure_profile',
                        'joining_date',
                        'Count employees by completed service in years'
                    )
            ) AS d(chart, source_column, formula)
        ),

        chart_stats AS (
            SELECT
                chart,
                SUM(headcount) AS included_hc,
                MAX(headcount) AS max_headcount
            FROM chart_counts
            GROUP BY chart
        ),

        chart_payloads AS (
            SELECT
                d.chart,

                JSONB_BUILD_OBJECT(
                    'source_column', d.source_column,
                    'formula', d.formula,
                    'total_hc', t.total_hc,

                    'included_hc',
                        COALESCE(s.included_hc, 0),

                    'excluded_hc',
                        t.total_hc - COALESCE(s.included_hc, 0),

                    'max_headcount',
                        COALESCE(s.max_headcount, 0),

                    'percentage_formula',
                        'headcount / included_hc * 100',

                    'scale_pct_formula',
                        'headcount / max_headcount * 100',

                    'data', COALESCE(
                        (
                            SELECT JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                    'label', c.label,
                                    'headcount', c.headcount,

                                    'percentage', ROUND(
                                        100.0 * c.headcount
                                        / NULLIF(s.included_hc, 0),
                                        1
                                    ),

                                    'scale_pct', COALESCE(
                                        ROUND(
                                            100.0 * c.headcount
                                            / NULLIF(s.max_headcount, 0),
                                            1
                                        ),
                                        0
                                    )
                                )
                                ORDER BY
                                    c.sort_order,
                                    c.headcount DESC,
                                    c.label NULLS LAST
                            )
                            FROM chart_counts c
                            WHERE c.chart = d.chart
                        ),
                        '[]'::JSONB
                    )
                ) AS payload

            FROM chart_definitions d
            LEFT JOIN chart_stats s ON s.chart = d.chart
            CROSS JOIN totals t
        ),

        retirement_by_function AS (
            SELECT
                function_name,
                COUNT(*) AS function_hc,

                COUNT(*) FILTER (
                    WHERE retires_lt_1_year
                ) AS lt_1_year,

                COUNT(*) FILTER (
                    WHERE retires_lt_3_years
                ) AS lt_3_years,

                COUNT(*) FILTER (
                    WHERE retires_lt_5_years
                ) AS lt_5_years

            FROM employees
            WHERE function_name IS NOT NULL
            GROUP BY function_name
        )

        SELECT
            (
                SELECT JSONB_OBJECT_AGG(chart, payload)
                FROM chart_payloads
            )
            ||
            JSONB_BUILD_OBJECT(
                'as_of_date', p_as_of_date,
                'data_basis', 'currently stored employee_namelist',

                'retirement_risk', JSONB_BUILD_OBJECT(
                    'source_column', 'entry_for_retirement',
                    'grouping_column', 'function',
                    'total_hc', t.total_hc,

                    'formula',
                        'Count retirement dates >= calculation date and < each anniversary',

                    'inputs', JSONB_BUILD_OBJECT(
                        'start_date_inclusive', p_as_of_date,

                        'end_1_year_exclusive',
                            (p_as_of_date + INTERVAL '1 year')::DATE,

                        'end_3_years_exclusive',
                            (p_as_of_date + INTERVAL '3 years')::DATE,

                        'end_5_years_exclusive',
                            (p_as_of_date + INTERVAL '5 years')::DATE,

                        'missing_or_invalid_retirement_dates',
                            t.missing_or_invalid_retirement_dates,

                        'past_retirement_dates',
                            t.past_retirement_dates,

                        'at_or_after_5_years',
                            t.retirement_at_or_after_5_years
                    ),

                    'summary', JSONB_BUILD_OBJECT(
                        'lt_1_year', t.retirement_lt_1_year,
                        'lt_3_years', t.retirement_lt_3_years,
                        'lt_5_years', t.retirement_lt_5_years
                    ),

                    'heatmap_scale_min', 0,

                    'heatmap_scale_max', COALESCE(
                        (
                            SELECT MAX(
                                GREATEST(
                                    lt_1_year,
                                    lt_3_years,
                                    lt_5_years
                                )
                            )
                            FROM retirement_by_function
                        ),
                        0
                    ),

                    'by_function', COALESCE(
                        (
                            SELECT JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                    'label', r.function_name,
                                    'function_hc', r.function_hc,
                                    'lt_1_year', r.lt_1_year,
                                    'lt_3_years', r.lt_3_years,
                                    'lt_5_years', r.lt_5_years
                                )
                                ORDER BY
                                    r.lt_5_years DESC,
                                    r.function_name NULLS LAST
                            )
                            FROM retirement_by_function r
                        ),
                        '[]'::JSONB
                    )
                ),

                'workforce_movement', JSONB_BUILD_OBJECT(
                    'status', 'calculated',
                    'source_column', 'employee_group',
                    'calculation_date', p_as_of_date,

                    'data_basis',
                        'Employee groups in the currently stored namelist',

                    'total_hc', t.total_hc,

                    'inputs', JSONB_BUILD_OBJECT(
                        'grouped_hc', ms.grouped_hc,
                        'headcount_matches',
                            ms.grouped_hc = t.total_hc
                    ),

                    'max_headcount', ms.max_headcount,

                    'formula',
                        'Count employees grouped by Employee Group',

                    'percentage_formula',
                        'headcount / total_hc * 100',

                    'scale_pct_formula',
                        'headcount / max_headcount * 100',

                    'data', COALESCE(
                        (
                            SELECT JSONB_AGG(
                                JSONB_BUILD_OBJECT(
                                    'label', mc.label,
                                    'headcount', mc.headcount,

                                    'percentage', ROUND(
                                        100.0 * mc.headcount
                                        / NULLIF(t.total_hc, 0),
                                        1
                                    ),

                                    'scale_pct', COALESCE(
                                        ROUND(
                                            100.0 * mc.headcount
                                            / NULLIF(ms.max_headcount, 0),
                                            1
                                        ),
                                        0
                                    )
                                )
                                ORDER BY
                                    mc.headcount DESC,
                                    mc.label NULLS LAST
                            )
                            FROM movement_counts mc
                        ),
                        '[]'::JSONB
                    )
                )
            )

        FROM totals t
        CROSS JOIN movement_stats ms
    );
END;
$$;