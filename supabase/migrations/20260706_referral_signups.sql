-- Cadastros atribuídos a links de parceiro (?ref=DB-XXXXXX)

CREATE TABLE IF NOT EXISTS referral_signups (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  referred_id   uuid NOT NULL UNIQUE REFERENCES profiles (id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_signups_code_format CHECK (referral_code ~ '^DB-[A-Z0-9]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_referral_signups_referrer
  ON referral_signups (referrer_id, created_at DESC);

COMMENT ON TABLE referral_signups IS
  'Usuário criou conta após clicar em link de parceiro (antes de assinar).';

ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "referral_signups_select_own" ON referral_signups;
CREATE POLICY "referral_signups_select_own" ON referral_signups
  FOR SELECT USING (auth.uid() = referrer_id);
