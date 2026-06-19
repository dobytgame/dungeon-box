-- Upgrade agendado para o próximo ciclo de cobrança
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_plan_id uuid REFERENCES plans(id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_pending_plan
  ON subscriptions(pending_plan_id)
  WHERE pending_plan_id IS NOT NULL;
