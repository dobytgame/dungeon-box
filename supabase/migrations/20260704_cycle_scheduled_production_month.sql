-- Mês planejado de produção (combos = 1 caixa por mês)

ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS scheduled_production_month date;

COMMENT ON COLUMN subscription_cycles.scheduled_production_month IS
  'Primeiro dia do mês planejado para produção/envio deste ciclo.';

CREATE INDEX IF NOT EXISTS idx_cycles_scheduled_production_month
  ON subscription_cycles (scheduled_production_month)
  WHERE scheduled_production_month IS NOT NULL;
