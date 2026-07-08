-- Cupons podem valer para assinatura, loja ou ambos.
ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS applies_to text NOT NULL DEFAULT 'subscription'
    CHECK (applies_to IN ('subscription', 'store', 'both'));

-- Cupom de frete grátis na loja (envio avulso).
INSERT INTO promo_codes (
  code,
  discount_type,
  discount_value,
  applies_to,
  active
)
VALUES (
  'LOJAFRETE',
  'free_shipping',
  0,
  'store',
  true
)
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  applies_to = EXCLUDED.applies_to,
  active = EXCLUDED.active;
