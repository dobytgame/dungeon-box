-- Pacotes combo (3/6/12 meses) e parcelamento

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS billing_term text NOT NULL DEFAULT 'monthly'
    CHECK (billing_term IN ('monthly', 'combo_3', 'combo_6', 'combo_12')),
  ADD COLUMN IF NOT EXISTS prepaid_months integer,
  ADD COLUMN IF NOT EXISTS prepaid_until timestamptz,
  ADD COLUMN IF NOT EXISTS combo_total_cents integer,
  ADD COLUMN IF NOT EXISTS combo_installments integer;

CREATE INDEX IF NOT EXISTS idx_subscriptions_prepaid_until
  ON subscriptions (prepaid_until)
  WHERE prepaid_until IS NOT NULL;
