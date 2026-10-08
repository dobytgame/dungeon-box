CREATE TABLE IF NOT EXISTS plan_upgrade_payment_links (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token            uuid NOT NULL UNIQUE,
  expires_at       timestamptz NOT NULL,
  used_at          timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plan_upgrade_payment_links_subscription
  ON plan_upgrade_payment_links (subscription_id, created_at DESC);

ALTER TABLE plan_upgrade_payment_links ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE plan_upgrade_payment_links IS
  'Link público para o cliente informar um cartão novo e pagar o upgrade de assinatura em atraso.';
