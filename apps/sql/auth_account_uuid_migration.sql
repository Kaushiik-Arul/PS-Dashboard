BEGIN;

ALTER TABLE public.auth_accounts
    ADD COLUMN account_id UUID DEFAULT GEN_RANDOM_UUID(),
    ADD COLUMN display_name TEXT;

UPDATE public.auth_accounts account
SET display_name = COALESCE(
    NULLIF(BTRIM(employee.official_email), ''),
    account.login_email
)
FROM public.employee_namelist employee
WHERE employee.pers_no = account.pers_no;

UPDATE public.auth_accounts
SET display_name = login_email
WHERE display_name IS NULL;

ALTER TABLE public.master_access
    ADD COLUMN account_id UUID,
    ADD COLUMN created_by_account_id UUID,
    ADD COLUMN updated_by_account_id UUID;

UPDATE public.master_access access
SET account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = access.pers_no;

UPDATE public.master_access access
SET created_by_account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = access.created_by;

UPDATE public.master_access access
SET updated_by_account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = access.updated_by;

ALTER TABLE public.auth_sessions
    ADD COLUMN account_id UUID;

UPDATE public.auth_sessions session
SET account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = session.pers_no;

ALTER TABLE public.security_audit_log
    ADD COLUMN actor_account_id UUID,
    ADD COLUMN target_account_id UUID;

UPDATE public.security_audit_log audit
SET actor_account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = audit.actor_pers_no;

UPDATE public.security_audit_log audit
SET target_account_id = account.account_id
FROM public.auth_accounts account
WHERE account.pers_no = audit.target_pers_no;

DROP INDEX public.auth_sessions_account_idx;
DROP INDEX public.security_audit_actor_idx;
DROP INDEX public.security_audit_target_idx;

ALTER TABLE public.master_access
    DROP CONSTRAINT master_access_pkey,
    DROP CONSTRAINT master_access_pers_no_fkey,
    DROP CONSTRAINT master_access_created_by_fkey,
    DROP CONSTRAINT master_access_updated_by_fkey;

ALTER TABLE public.auth_sessions
    DROP CONSTRAINT auth_sessions_pers_no_fkey;

ALTER TABLE public.security_audit_log
    DROP CONSTRAINT security_audit_log_actor_pers_no_fkey;

ALTER TABLE public.auth_accounts
    DROP CONSTRAINT auth_accounts_pkey,
    ALTER COLUMN pers_no DROP NOT NULL,
    ALTER COLUMN account_id SET NOT NULL,
    ALTER COLUMN display_name SET NOT NULL,
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (account_id),
    ADD CONSTRAINT auth_accounts_pers_no_key UNIQUE (pers_no),
    ADD CONSTRAINT auth_accounts_display_name_check
        CHECK (NULLIF(BTRIM(display_name), '') IS NOT NULL);

ALTER TABLE public.master_access
    DROP COLUMN pers_no,
    DROP COLUMN created_by,
    DROP COLUMN updated_by,
    ALTER COLUMN account_id SET NOT NULL,
    ADD CONSTRAINT master_access_pkey PRIMARY KEY (account_id),
    ADD CONSTRAINT master_access_account_id_fkey
        FOREIGN KEY (account_id)
        REFERENCES public.auth_accounts(account_id)
        ON DELETE RESTRICT,
    ADD CONSTRAINT master_access_created_by_account_id_fkey
        FOREIGN KEY (created_by_account_id)
        REFERENCES public.auth_accounts(account_id),
    ADD CONSTRAINT master_access_updated_by_account_id_fkey
        FOREIGN KEY (updated_by_account_id)
        REFERENCES public.auth_accounts(account_id);

ALTER TABLE public.auth_sessions
    DROP COLUMN pers_no,
    ALTER COLUMN account_id SET NOT NULL,
    ADD CONSTRAINT auth_sessions_account_id_fkey
        FOREIGN KEY (account_id)
        REFERENCES public.auth_accounts(account_id)
        ON DELETE CASCADE;

ALTER TABLE public.security_audit_log
    DROP COLUMN actor_pers_no,
    DROP COLUMN target_pers_no,
    ADD CONSTRAINT security_audit_log_actor_account_id_fkey
        FOREIGN KEY (actor_account_id)
        REFERENCES public.auth_accounts(account_id)
        ON DELETE SET NULL,
    ADD CONSTRAINT security_audit_log_target_account_id_fkey
        FOREIGN KEY (target_account_id)
        REFERENCES public.auth_accounts(account_id)
        ON DELETE SET NULL;

CREATE INDEX auth_sessions_account_idx
    ON public.auth_sessions (account_id, expires_at DESC);

CREATE INDEX security_audit_actor_idx
    ON public.security_audit_log (actor_account_id, created_at DESC);

CREATE INDEX security_audit_target_idx
    ON public.security_audit_log (target_account_id, created_at DESC);

COMMIT;