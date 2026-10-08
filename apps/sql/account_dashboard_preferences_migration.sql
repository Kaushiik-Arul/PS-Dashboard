BEGIN;

CREATE TABLE IF NOT EXISTS public.account_dashboard_preferences (
  account_id UUID NOT NULL
    REFERENCES public.auth_accounts(account_id) ON DELETE CASCADE,
  dashboard_key TEXT NOT NULL,
  widget_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (account_id, dashboard_key),
  CONSTRAINT account_dashboard_preferences_key_check
    CHECK (dashboard_key = BTRIM(dashboard_key) AND dashboard_key <> '' AND LENGTH(dashboard_key) <= 100),
  CONSTRAINT account_dashboard_preferences_widget_count_check
    CHECK (CARDINALITY(widget_ids) <= 64)
);

COMMIT;
