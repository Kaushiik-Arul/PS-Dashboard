BEGIN;

UPDATE public.auth_accounts
SET account_status = 'active',
    updated_at = CURRENT_TIMESTAMP
WHERE account_status = 'locked';

ALTER TABLE public.auth_accounts
    DROP CONSTRAINT IF EXISTS auth_accounts_lock_state_check,
    DROP CONSTRAINT IF EXISTS auth_accounts_failed_attempts_check,
    DROP CONSTRAINT IF EXISTS auth_accounts_status_check,
    DROP COLUMN IF EXISTS failed_login_attempts,
    DROP COLUMN IF EXISTS locked_until;

ALTER TABLE public.auth_accounts
    ADD CONSTRAINT auth_accounts_status_check
        CHECK (account_status IN ('active', 'inactive'));

COMMIT;