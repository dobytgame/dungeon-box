-- Histórico de mudanças de plano (upgrade agendado, efetivado ou cancelado)

CREATE TABLE IF NOT EXISTS subscription_plan_changes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_plan_id    uuid REFERENCES plans(id) ON DELETE SET NULL,
  to_plan_id      uuid REFERENCES plans(id) ON DELETE SET NULL,
  event           text NOT NULL CHECK (event IN ('scheduled', 'applied', 'cancelled')),
  actor           text NOT NULL CHECK (actor IN ('user', 'admin', 'system')),
  actor_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_user
  ON subscription_plan_changes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_subscription_plan_changes_subscription
  ON subscription_plan_changes(subscription_id, created_at DESC);
