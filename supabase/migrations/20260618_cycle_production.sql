-- Produção de ciclos: status cancelado e metadados operacionais

ALTER TYPE cycle_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text,
  ADD COLUMN IF NOT EXISTS production_notes text;

CREATE INDEX IF NOT EXISTS idx_cycles_status ON subscription_cycles(status);
CREATE INDEX IF NOT EXISTS idx_cycles_status_created ON subscription_cycles(status, created_at);
