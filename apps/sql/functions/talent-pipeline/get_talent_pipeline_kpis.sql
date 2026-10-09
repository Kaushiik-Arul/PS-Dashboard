DROP FUNCTION IF EXISTS public.get_talent_pipeline_kpis(DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.get_talent_pipeline_kpis(DATE, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], UUID);

CREATE OR REPLACE FUNCTION public.get_talent_pipeline_kpis(
    p_as_of_date DATE DEFAULT CURRENT_DATE,
    p_function TEXT[] DEFAULT NULL,
    p_organizational_unit TEXT[] DEFAULT NULL,
    p_range TEXT[] DEFAULT NULL,
    p_location TEXT[] DEFAULT NULL,
    p_gender_key TEXT[] DEFAULT NULL,
    p_direct_or_indirect TEXT[] DEFAULT NULL,
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
                LOWER(BTRIM(t.active_passive)) AS activity,
                t.to_date
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
              AND (COALESCE(CARDINALITY(p_function), 0) = 0 OR BTRIM(e.function) = ANY(p_function))
              AND (COALESCE(CARDINALITY(p_organizational_unit), 0) = 0 OR BTRIM(e.organizational_unit) = ANY(p_organizational_unit))
              AND (COALESCE(CARDINALITY(p_range), 0) = 0 OR BTRIM(e.range) = ANY(p_range))
              AND (COALESCE(CARDINALITY(p_location), 0) = 0 OR BTRIM(e.location) = ANY(p_location))
              AND (COALESCE(CARDINALITY(p_gender_key), 0) = 0 OR BTRIM(e.gender_key) = ANY(p_gender_key))
              AND (COALESCE(CARDINALITY(p_direct_or_indirect), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY(p_direct_or_indirect))
        ),
        development AS (
            SELECT LOWER(BTRIM(d.development_pool)) AS category
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
              AND (COALESCE(CARDINALITY(p_function), 0) = 0 OR BTRIM(e.function) = ANY(p_function))
              AND (COALESCE(CARDINALITY(p_organizational_unit), 0) = 0 OR BTRIM(e.organizational_unit) = ANY(p_organizational_unit))
              AND (COALESCE(CARDINALITY(p_range), 0) = 0 OR BTRIM(e.range) = ANY(p_range))
              AND (COALESCE(CARDINALITY(p_location), 0) = 0 OR BTRIM(e.location) = ANY(p_location))
              AND (COALESCE(CARDINALITY(p_gender_key), 0) = 0 OR BTRIM(e.gender_key) = ANY(p_gender_key))
              AND (COALESCE(CARDINALITY(p_direct_or_indirect), 0) = 0 OR BTRIM(e.direct_or_indirect) = ANY(p_direct_or_indirect))
        ),
        talent_metrics AS (
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE activity = 'active') AS active,
                COUNT(*) FILTER (WHERE activity = 'passive') AS passive,
                COUNT(*) FILTER (
                    WHERE to_date >= p_as_of_date
                      AND to_date < p_as_of_date + INTERVAL '6 months'
                ) AS expiring_within_6_months,
                COUNT(*) FILTER (
                    WHERE to_date >= p_as_of_date
                      AND to_date < p_as_of_date + INTERVAL '12 months'
                ) AS expiring_within_12_months
            FROM talent
        ),
        development_metrics AS (
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE category = 'female talent') AS female_talent,
                COUNT(*) FILTER (WHERE category = 'key to retain') AS key_to_retain,
                COUNT(*) FILTER (WHERE category = 'future talent') AS future_talent,
                COUNT(*) FILTER (WHERE category = 'change wanted') AS change_wanted
            FROM development
        )
        SELECT JSONB_BUILD_OBJECT(
            'as_of_date', p_as_of_date,
            'total_talent_pool', JSONB_BUILD_OBJECT(
                'value', t.total,
                'formula', 'Count all scoped Talent Pool Register rows'
            ),
            'active_talent_pool', JSONB_BUILD_OBJECT(
                'value', t.active,
                'percentage', ROUND(100.0 * t.active / NULLIF(t.total, 0), 1),
                'formula', 'Count Talent Pool rows where Active/Passive = Active'
            ),
            'passive_talent_pool', JSONB_BUILD_OBJECT(
                'value', t.passive,
                'percentage', ROUND(100.0 * t.passive / NULLIF(t.total, 0), 1),
                'formula', 'Count Talent Pool rows where Active/Passive = Passive'
            ),
            'development_pool', JSONB_BUILD_OBJECT(
                'value', d.total,
                'formula', 'Count all scoped Development Pool Register rows'
            ),
            'female_talent', JSONB_BUILD_OBJECT(
                'value', d.female_talent,
                'percentage', ROUND(100.0 * d.female_talent / NULLIF(d.total, 0), 1),
                'formula', 'Count Development Pool rows where Development Pool = Female Talent'
            ),
            'key_to_retain', JSONB_BUILD_OBJECT(
                'value', d.key_to_retain,
                'percentage', ROUND(100.0 * d.key_to_retain / NULLIF(d.total, 0), 1),
                'formula', 'Count Development Pool rows where Development Pool = Key to Retain'
            ),
            'future_talent', JSONB_BUILD_OBJECT(
                'value', d.future_talent,
                'percentage', ROUND(100.0 * d.future_talent / NULLIF(d.total, 0), 1),
                'formula', 'Count Development Pool rows where Development Pool = Future Talent'
            ),
            'change_wanted', JSONB_BUILD_OBJECT(
                'value', d.change_wanted,
                'percentage', ROUND(100.0 * d.change_wanted / NULLIF(d.total, 0), 1),
                'formula', 'Count Development Pool rows where Development Pool = Change Wanted'
            ),
            'talent_pool_expiring', JSONB_BUILD_OBJECT(
                'within_6_months', t.expiring_within_6_months,
                'within_12_months', t.expiring_within_12_months,
                'source_column', 'talent_pool_register.to_date',
                'formula', 'Count To dates from the calculation date up to each exclusive month boundary'
            )
        )
        FROM talent_metrics t
        CROSS JOIN development_metrics d
    );
END;
$$;