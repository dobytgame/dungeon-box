-- Cupons de checkout gerenciados no site (desconto aplicado antes do Asaas)

CREATE TABLE promo_codes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL UNIQUE,
  discount_type    text NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value   integer NOT NULL CHECK (discount_value > 0),
  max_redemptions  integer,
  times_redeemed   integer NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  active           boolean NOT NULL DEFAULT true,
  plan_slugs       text[],
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT promo_codes_percent_range CHECK (
    discount_type <> 'percent' OR (discount_value > 0 AND discount_value <= 100)
  )
);

CREATE TABLE promo_code_redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id    uuid NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id  uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS promo_code text;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes (code);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_code_redemptions (user_id);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- Escrita/leitura apenas via service role nas APIs de checkout
--
-- Exemplo de cupom (10% em qualquer plano):
-- INSERT INTO promo_codes (code, discount_type, discount_value)
-- VALUES ('GUILD10', 'percent', 10);
