CREATE OR REPLACE FUNCTION public.get_talent_pipeline_charts(
    p_as_of_date DATE DEFAULT CURRENT_DATE,
    p_function TEXT DEFAULT NULL,
    p_organizational_unit TEXT DEFAULT NULL,
    p_range TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_gender_key TEXT DEFAULT NULL,
    p_direct_or_indirect TEXT DEFAULT NULL,
    p_account_id UUID DEFAULT NULL
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

    RETURN (
        WITH talent AS (
            SELECT
                NULLIF(BTRIM(t.talent_pool), '') AS talent_pool,
                CASE LOWER(BTRIM(t.active_passive))
                    WHEN 'active' THEN 'Active'
                    WHEN 'passive' THEN 'Passive'
                END AS activity,
                NULLIF(BTRIM(t.gender), '') AS gender,
                NULLIF(BTRIM(t.range), '') AS range_name
            FROM public.talent_pool_register t
            LEFT JOIN public.employee_namelist e ON e.pers_no = t.pers_no
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
              AND (p_function IS NULL OR BTRIM(e.function) = p_function)
              AND (p_organizational_unit IS NULL OR BTRIM(e.organizational_unit) = p_organizational_unit)
              AND (p_range IS NULL OR BTRIM(e.range) = p_range)
              AND (p_location IS NULL OR BTRIM(e.location) = p_location)
              AND (p_gender_key IS NULL OR BTRIM(e.gender_key) = p_gender_key)
              AND (p_direct_or_indirect IS NULL OR BTRIM(e.direct_or_indirect) = p_direct_or_indirect)
        ),
        development AS (
            SELECT
                CASE LOWER(BTRIM(d.development_pool))
                    WHEN 'female talent' THEN 'Female talent'
                    WHEN 'key to retain' THEN 'Key to retain'
                    WHEN 'future talent' THEN 'Future talent'
                    WHEN 'change wanted' THEN 'Change wanted'
                    ELSE BTRIM(d.development_pool)
                END AS category
            FROM public.development_pool_register d
            LEFT JOIN public.employee_namelist e ON e.pers_no = d.employee_no
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
              AND (p_function IS NULL OR BTRIM(e.function) = p_function)
              AND (p_organizational_unit IS NULL OR BTRIM(e.organizational_unit) = p_organizational_unit)
              AND (p_range IS NULL OR BTRIM(e.range) = p_range)
              AND (p_location IS NULL OR BTRIM(e.location) = p_location)
              AND (p_gender_key IS NULL OR BTRIM(e.gender_key) = p_gender_key)
              AND (p_direct_or_indirect IS NULL OR BTRIM(e.direct_or_indirect) = p_direct_or_indirect)
        ),
        latest_nomination_year AS (
            SELECT MAX(year) AS year
            FROM public.nomination_status_rows
        ),
        nomination AS (
            SELECT
                CASE n.result
                    WHEN 'Cleared' THEN 'Green'
                    WHEN 'Amber' THEN 'Amber'
                    WHEN 'Not Cleared' THEN 'Red'
                END AS status
            FROM public.nomination_status_rows n
            LEFT JOIN public.employee_namelist e ON e.pers_no = n.employee_no
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
              AND (p_function IS NULL OR BTRIM(e.function) = p_function)
              AND (p_organizational_unit IS NULL OR BTRIM(e.organizational_unit) = p_organizational_unit)
              AND (p_range IS NULL OR BTRIM(e.range) = p_range)
              AND (p_location IS NULL OR BTRIM(e.location) = p_location)
              AND (p_gender_key IS NULL OR BTRIM(e.gender_key) = p_gender_key)
              AND (p_direct_or_indirect IS NULL OR BTRIM(e.direct_or_indirect) = p_direct_or_indirect)
        ),
        distributions AS (
            SELECT 'talent_pool_distribution' AS chart, talent_pool AS label, COUNT(*) AS headcount
            FROM talent WHERE talent_pool IS NOT NULL GROUP BY talent_pool
            UNION ALL
            SELECT 'active_passive_distribution', activity, COUNT(*)
            FROM talent WHERE activity IS NOT NULL GROUP BY activity
            UNION ALL
            SELECT 'development_pool_distribution', category, COUNT(*)
            FROM development WHERE category IS NOT NULL GROUP BY category
            UNION ALL
            SELECT 'talent_gender_distribution', gender, COUNT(*)
            FROM talent WHERE gender IS NOT NULL GROUP BY gender
            UNION ALL
            SELECT 'talent_range_distribution', range_name, COUNT(*)
            FROM talent WHERE range_name IS NOT NULL GROUP BY range_name
            UNION ALL
            SELECT 'nomination_status_distribution', status, COUNT(*)
            FROM nomination WHERE status IS NOT NULL GROUP BY status
        ),
        totals AS (
            SELECT chart, SUM(headcount) AS total
            FROM distributions
            GROUP BY chart
        ),
        chart_names AS (
            SELECT UNNEST(ARRAY[
                'talent_pool_distribution',
                'active_passive_distribution',
                'nomination_status_distribution',
                'development_pool_distribution',
                'talent_gender_distribution',
                'talent_range_distribution'
            ]) AS chart
        )
                SELECT
                        JSONB_BUILD_OBJECT(
                                'as_of_date', p_as_of_date,
                                'nomination_year', (SELECT year FROM latest_nomination_year)
                        )
                        || COALESCE(
                                (
                                        SELECT JSONB_OBJECT_AGG(
                                                name.chart,
                                                JSONB_BUILD_OBJECT(
                                                        'data', COALESCE(
                                                                (
                                                                        SELECT JSONB_AGG(
                                                                                JSONB_BUILD_OBJECT(
                                                                                        'label', value.label,
                                                                                        'headcount', value.headcount,
                                                                                        'percentage', ROUND(
                                                                                                100.0 * value.headcount
                                                                                                / NULLIF(total.total, 0),
                                                                                                1
                                                                                        )
                                                                                )
                                                                                ORDER BY
                                                                                        CASE
                                                                                                WHEN value.chart = 'active_passive_distribution'
                                                                                                    AND value.label = 'Active' THEN 1
                                                                                                WHEN value.chart = 'active_passive_distribution'
                                                                                                    AND value.label = 'Passive' THEN 2
                                                                                                WHEN value.chart = 'nomination_status_distribution'
                                                                                                    AND value.label = 'Green' THEN 1
                                                                                                WHEN value.chart = 'nomination_status_distribution'
                                                                                                    AND value.label = 'Amber' THEN 2
                                                                                                WHEN value.chart = 'nomination_status_distribution'
                                                                                                    AND value.label = 'Red' THEN 3
                                                                                                WHEN value.chart = 'development_pool_distribution'
                                                                                                    AND value.label = 'Female talent' THEN 1
                                                                                                WHEN value.chart = 'development_pool_distribution'
                                                                                                    AND value.label = 'Key to retain' THEN 2
                                                                                                WHEN value.chart = 'development_pool_distribution'
                                                                                                    AND value.label = 'Future talent' THEN 3
                                                                                                WHEN value.chart = 'development_pool_distribution'
                                                                                                    AND value.label = 'Change wanted' THEN 4
                                                                                                ELSE 100
                                                                                        END,
                                                                                        value.headcount DESC,
                                                                                        value.label
                                                                        )
                                                                        FROM distributions value
                                                                        INNER JOIN totals total
                                                                            ON total.chart = value.chart
                                                                        WHERE value.chart = name.chart
                                                                ),
                                                                '[]'::JSONB
                                                        )
                                                )
                                        )
                                        FROM chart_names name
                                ),
                                '{}'::JSONB
                        )
    );
END;
$$;