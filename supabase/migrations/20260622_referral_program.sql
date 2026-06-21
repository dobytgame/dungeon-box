-- Sistema Indique e Ganhe

CREATE TYPE referral_status AS ENUM ('pending', 'qualified', 'cancelled', 'expired');
CREATE TYPE points_ledger_type AS ENUM ('credit', 'debit', 'expiry');
CREATE TYPE redemption_reward_type AS ENUM (
  'tintas', 'avulso', 'aventureiro', 'heroi', 'lendario'
);
CREATE TYPE redemption_status AS ENUM ('pending', 'sent', 'cancelled');

CREATE TABLE referral_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  code              text NOT NULL UNIQUE,
  total_referrals   integer NOT NULL DEFAULT 0,
  total_conversions integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^DB-[A-Z0-9]{6}$')
);

CREATE TABLE referrals (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id              uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  referred_subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  status                   referral_status NOT NULL DEFAULT 'pending',
  points_credited          boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  qualified_at             timestamptz
);

CREATE TABLE redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_type      redemption_reward_type NOT NULL,
  points_spent     integer NOT NULL CHECK (points_spent > 0),
  status           redemption_status NOT NULL DEFAULT 'pending',
  shipping_address jsonb NOT NULL,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz
);

CREATE TABLE points_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referral_id   uuid REFERENCES referrals(id) ON DELETE SET NULL,
  redemption_id uuid REFERENCES redemptions(id) ON DELETE SET NULL,
  amount        integer NOT NULL,
  type          points_ledger_type NOT NULL,
  description   text NOT NULL,
  expires_at    timestamptz,
  expired       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT points_ledger_amount_nonzero CHECK (amount <> 0)
);

CREATE INDEX idx_referral_codes_code ON referral_codes (upper(code));
CREATE INDEX idx_referrals_referrer ON referrals (referrer_id);
CREATE INDEX idx_referrals_status ON referrals (status);
CREATE INDEX idx_points_ledger_user ON points_ledger (user_id, created_at);
CREATE INDEX idx_points_ledger_expires ON points_ledger (expires_at)
  WHERE type = 'credit' AND NOT expired;
CREATE INDEX idx_redemptions_user ON redemptions (user_id);

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes_select_own" ON referral_codes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "referrals_select_own" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id);

CREATE POLICY "points_ledger_select_own" ON points_ledger
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "redemptions_select_own" ON redemptions
  FOR SELECT USING (auth.uid() = user_id);
