-- Cupons de lançamento por plano (1 uso por conta; desconto recorrente enquanto assinatura ativa).

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS includes_free_shipping boolean NOT NULL DEFAULT false;

INSERT INTO promo_codes (
  code,
  discount_type,
  discount_value,
  plan_slugs,
  includes_free_shipping,
  active
)
VALUES
  ('AVENTUREIRO10', 'percent', 10, ARRAY['aventureiro']::text[], false, true),
  ('HEROI10', 'percent', 10, ARRAY['heroi']::text[], false, true),
  ('LENDARIOFRETE', 'percent', 8, ARRAY['lendario']::text[], true, true)
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  plan_slugs = EXCLUDED.plan_slugs,
  includes_free_shipping = EXCLUDED.includes_free_shipping,
  active = EXCLUDED.active;
