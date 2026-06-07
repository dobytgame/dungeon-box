-- Assinaturas

CREATE TABLE subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id               uuid REFERENCES plans(id),
  address_id            uuid REFERENCES addresses(id),
  status                subscription_status DEFAULT 'pending',
  mp_subscription_id    text UNIQUE,
  mp_payer_id           text,
  color_choices         text[],
  special_notes         text,
  started_at            timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  next_billing_date     timestamptz,
  cancelled_at          timestamptz,
  cancel_reason         text,
  current_cycle         integer DEFAULT 0,
  loyalty_level         integer DEFAULT 1,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_subscriptions_user   ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_mp_id  ON subscriptions(mp_subscription_id);
