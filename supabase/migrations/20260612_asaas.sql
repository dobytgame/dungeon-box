-- Asaas billing (execute no Supabase SQL Editor)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS asaas_customer_id text UNIQUE;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS asaas_customer_id text,
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text UNIQUE;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS asaas_payment_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_id
  ON subscriptions(asaas_subscription_id);
