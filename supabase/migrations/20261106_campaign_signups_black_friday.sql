-- Black Friday 2026: assinaturas feitas pelo checkout da campanha

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS campaign_code text,
  ADD COLUMN IF NOT EXISTS combo_renewal_cents integer;

COMMENT ON COLUMN subscriptions.campaign_code IS
  'Campanha de origem da assinatura (ex.: black-friday-2026).';
COMMENT ON COLUMN subscriptions.combo_renewal_cents IS
  'Combo: valor da renovação automática quando difere de combo_total_cents (ex.: preço promocional só no 1º pacote).';

CREATE INDEX IF NOT EXISTS idx_subscriptions_campaign_code
  ON subscriptions (campaign_code)
  WHERE campaign_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS campaign_signups (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code          text NOT NULL,
  user_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_id        uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  plan_slug              text NOT NULL,
  billing_term           text NOT NULL,
  plan_cents             integer NOT NULL,
  shipping_cents         integer NOT NULL,
  discount_percent       numeric(5, 2) NOT NULL,
  discount_cycles        integer,
  discount_cents         integer NOT NULL,
  installments           integer NOT NULL DEFAULT 1,
  interest_rate_monthly  numeric(6, 4),
  interest_cents         integer NOT NULL DEFAULT 0,
  first_charge_cents     integer NOT NULL,
  renewal_cents          integer,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaign_signups_subscription_unique UNIQUE (campaign_code, subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_signups_campaign_created
  ON campaign_signups (campaign_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_signups_user
  ON campaign_signups (user_id);

ALTER TABLE campaign_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_signups_select_own"
  ON campaign_signups FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON TABLE campaign_signups IS
  'Assinaturas criadas por checkouts de campanha, com o preço promocional aplicado.';
COMMENT ON COLUMN campaign_signups.first_charge_cents IS
  'Valor da 1ª cobrança (mensal com desconto + frete, ou combo com juros do parcelamento).';

NOTIFY pgrst, 'reload schema';
