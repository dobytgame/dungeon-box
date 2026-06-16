-- Frete por assinatura + múltiplas assinaturas (um plano ativo por vez)

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_region text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_plan_blocking
  ON subscriptions (user_id, plan_id)
  WHERE status IN ('pending', 'active', 'paused', 'past_due');
