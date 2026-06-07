-- Ciclos mensais (depende de subscriptions, payments, themes)

CREATE TABLE subscription_cycles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  uuid REFERENCES subscriptions(id) ON DELETE CASCADE,
  cycle_number     integer NOT NULL,
  theme_id         uuid REFERENCES themes(id),
  status           cycle_status DEFAULT 'upcoming',
  payment_id       uuid REFERENCES payments(id),
  paid_at          timestamptz,
  amount_cents     integer,
  tracking_code    text,
  carrier          text,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  estimated_delivery date,
  color_choices    text[],
  bonus_pieces     integer DEFAULT 0,
  bonus_notes      text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_cycles_subscription ON subscription_cycles(subscription_id);
