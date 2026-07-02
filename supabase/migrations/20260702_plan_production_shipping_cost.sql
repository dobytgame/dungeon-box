-- Custo de produção por plano e custo real de envio por ciclo (margem por kit)

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS production_cost_cents integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN plans.production_cost_cents IS
  'Custo estimado de produção de uma caixa deste plano (centavos).';

ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS shipping_cost_cents integer;

COMMENT ON COLUMN subscription_cycles.shipping_cost_cents IS
  'Custo real pago ao transportador no envio deste ciclo (centavos).';
