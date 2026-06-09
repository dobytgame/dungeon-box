-- Leads da LP de lançamento (newsletter / lista de espera)
CREATE TABLE IF NOT EXISTS newsletter_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source      text NOT NULL DEFAULT 'launch_lp',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_leads_email_unique_idx
  ON newsletter_leads (email);

ALTER TABLE newsletter_leads ENABLE ROW LEVEL SECURITY;
