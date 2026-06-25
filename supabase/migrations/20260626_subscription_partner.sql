-- Assinaturas de parceiro: sem cobrança no gateway, produção normal.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_subscriptions_is_partner
  ON subscriptions (is_partner)
  WHERE is_partner = true;
