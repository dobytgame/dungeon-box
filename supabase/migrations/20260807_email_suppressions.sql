-- Suppressões de e-mail (bounce hard / spam complaint / descadastro).
CREATE TABLE IF NOT EXISTS email_suppressions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  reason        text NOT NULL CHECK (reason IN (
                  'unsubscribe',
                  'complaint',
                  'hard_bounce',
                  'manual'
                )),
  source        text,
  resend_email_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_suppressions_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS email_suppressions_reason_idx
  ON email_suppressions (reason);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
