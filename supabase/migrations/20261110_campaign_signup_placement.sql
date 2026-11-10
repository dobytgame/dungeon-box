-- Black Friday: origem do CTA (hero, oferta no meio da LP, etc.) e intenções de checkout

ALTER TABLE campaign_signups
  ADD COLUMN IF NOT EXISTS cta_placement text NOT NULL DEFAULT 'unknown';

COMMENT ON COLUMN campaign_signups.cta_placement IS
  'Origem do clique na LP: hero, oferta (meio), sticky, footer, promo_bar, direct, unknown.';

CREATE INDEX IF NOT EXISTS idx_campaign_signups_campaign_placement
  ON campaign_signups (campaign_code, cta_placement);

CREATE TABLE IF NOT EXISTS campaign_checkout_intents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code   text NOT NULL,
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  cta_placement   text NOT NULL DEFAULT 'unknown',
  billing_option  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_checkout_intents_campaign_created
  ON campaign_checkout_intents (campaign_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_checkout_intents_placement
  ON campaign_checkout_intents (campaign_code, cta_placement);

ALTER TABLE campaign_checkout_intents ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE campaign_checkout_intents IS
  'Visitas autenticadas ao checkout da campanha (funil antes da conversão em campaign_signups).';

NOTIFY pgrst, 'reload schema';
