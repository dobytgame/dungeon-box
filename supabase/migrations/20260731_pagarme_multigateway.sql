-- Pagar.me multi-gateway + admin toggle

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pagarme_customer_id text UNIQUE;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pagarme_customer_id text,
  ADD COLUMN IF NOT EXISTS pagarme_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS card_last4 text,
  ADD COLUMN IF NOT EXISTS card_brand text,
  ADD COLUMN IF NOT EXISTS update_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS migrated_to_pagarme_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_subscriptions_pagarme_id
  ON subscriptions(pagarme_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_update_requested
  ON subscriptions(update_requested_at)
  WHERE update_requested_at IS NOT NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS pagarme_charge_id text UNIQUE;

CREATE TABLE IF NOT EXISTS gateway_config (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  active_gateway  text NOT NULL DEFAULT 'asaas'
                    CHECK (active_gateway IN ('asaas', 'pagarme')),
  updated_by      uuid REFERENCES auth.users(id),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gateway_config (active_gateway)
SELECT 'asaas'
WHERE NOT EXISTS (SELECT 1 FROM gateway_config);

ALTER TABLE gateway_config ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gateway_migration_log (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_from     text NOT NULL,
  gateway_to       text NOT NULL,
  update_token     text UNIQUE,
  token_expires_at timestamptz,
  email_sent_at    timestamptz,
  card_updated_at  timestamptz,
  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'updated', 'expired', 'failed')),
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gateway_migration_sub
  ON gateway_migration_log(subscription_id);

CREATE INDEX IF NOT EXISTS idx_gateway_migration_token
  ON gateway_migration_log(update_token)
  WHERE update_token IS NOT NULL;
