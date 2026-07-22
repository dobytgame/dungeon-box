-- Histórico de disparos de campanhas de marketing (por destinatário)

CREATE TABLE IF NOT EXISTS marketing_campaign_dispatches (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      text NOT NULL,
  audience         text NOT NULL,
  subject          text NOT NULL,
  actor_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count       integer NOT NULL DEFAULT 0,
  failed_count     integer NOT NULL DEFAULT 0,
  skipped_count    integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz
);

CREATE TABLE IF NOT EXISTS marketing_campaign_recipients (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id    uuid NOT NULL REFERENCES marketing_campaign_dispatches(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  email          text NOT NULL,
  name           text,
  status         text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  resend_id      text,
  error_message  text,
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mkt_dispatch_created
  ON marketing_campaign_dispatches (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_dispatch_template
  ON marketing_campaign_dispatches (template_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mkt_recipients_dispatch
  ON marketing_campaign_recipients (dispatch_id);

CREATE INDEX IF NOT EXISTS idx_mkt_recipients_status
  ON marketing_campaign_recipients (dispatch_id, status);

CREATE INDEX IF NOT EXISTS idx_mkt_recipients_email
  ON marketing_campaign_recipients (email);

ALTER TABLE marketing_campaign_dispatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaign_recipients ENABLE ROW LEVEL SECURITY;

-- Cupom da campanha VOLTEI10 (10% no primeiro mês, qualquer plano, 7 dias)
INSERT INTO promo_codes (
  code,
  discount_type,
  discount_value,
  expires_at,
  active,
  applies_to
)
VALUES (
  'VOLTEI10',
  'percent',
  10,
  now() + interval '7 days',
  true,
  'subscription'
)
ON CONFLICT (code) DO UPDATE SET
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  expires_at = EXCLUDED.expires_at,
  active = EXCLUDED.active,
  applies_to = EXCLUDED.applies_to;
