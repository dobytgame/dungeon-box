-- Stripe billing (execute no Supabase SQL Editor)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
  ON subscriptions(stripe_subscription_id);
