-- Tema físico do kit da assinatura (store_kit_themes).
-- Sem valor = kit 1. Troca só enquanto o ciclo está em upcoming.

ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS kit_theme_id uuid REFERENCES store_kit_themes(id),
  ADD COLUMN IF NOT EXISTS kit_theme_changed_from_id uuid REFERENCES store_kit_themes(id);

CREATE INDEX IF NOT EXISTS subscription_cycles_kit_theme_id_idx
  ON subscription_cycles (kit_theme_id)
  WHERE kit_theme_id IS NOT NULL;

COMMENT ON COLUMN subscription_cycles.kit_theme_id IS
  'Tema do kit escolhido pelo assinante. Null = kit 1 (padrão).';
COMMENT ON COLUMN subscription_cycles.kit_theme_changed_from_id IS
  'Tema anterior quando o assinante trocou o kit antes da produção.';
