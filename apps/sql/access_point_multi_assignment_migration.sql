BEGIN;

ALTER TABLE public.master_access
    RENAME TO master_access_single_role;

ALTER TABLE public.master_access_single_role
    RENAME CONSTRAINT master_access_pkey TO master_access_single_role_pkey;

CREATE TABLE public.master_access (
    access_assignment_id UUID PRIMARY KEY DEFAULT GEN_RANDOM_UUID(),
    account_id UUID NOT NULL
        REFERENCES public.auth_accounts(account_id) ON DELETE RESTRICT,

    role TEXT NOT NULL,
    assigned_range TEXT,
    assigned_org_unit TEXT,

    created_by_account_id UUID
        REFERENCES public.auth_accounts(account_id),
    updated_by_account_id UUID
        REFERENCES public.auth_accounts(account_id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT master_access_role_check CHECK (
        role IN (
            'hrbp',
            'admin',
            'range_head',
            'department_head',
            'sub_department_head'
        )
    ),
    CONSTRAINT master_access_scope_check CHECK (
        (role IN ('hrbp', 'admin')
            AND assigned_range IS NULL
            AND assigned_org_unit IS NULL)
        OR
        (role = 'range_head'
            AND NULLIF(BTRIM(assigned_range), '') IS NOT NULL
            AND assigned_org_unit IS NULL)
        OR
        (role IN ('department_head', 'sub_department_head')
            AND NULLIF(BTRIM(assigned_range), '') IS NOT NULL
            AND NULLIF(BTRIM(assigned_org_unit), '') IS NOT NULL)
    ),
    CONSTRAINT master_access_timestamps_check
        CHECK (updated_at >= created_at)
);

INSERT INTO public.master_access (
    account_id,
    role,
    assigned_range,
    assigned_org_unit,
    created_by_account_id,
    updated_by_account_id,
    created_at,
    updated_at
)
SELECT
    account_id,
    role,
    assigned_range,
    NULL,
    created_by_account_id,
    updated_by_account_id,
    created_at,
    updated_at
FROM public.master_access_single_role;

CREATE UNIQUE INDEX master_access_assignment_unique
    ON public.master_access (
        account_id,
        role,
        COALESCE(assigned_range, ''),
        COALESCE(assigned_org_unit, '')
    );

CREATE INDEX master_access_account_idx
    ON public.master_access (account_id);

CREATE INDEX master_access_scope_idx
    ON public.master_access (assigned_range, assigned_org_unit)
    WHERE assigned_range IS NOT NULL;

DROP TABLE public.master_access_single_role;

COMMIT;