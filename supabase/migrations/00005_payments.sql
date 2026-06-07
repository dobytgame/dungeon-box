-- Pagamentos

CREATE TABLE payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid REFERENCES profiles(id),
  subscription_id   uuid REFERENCES subscriptions(id),
  mp_payment_id     text UNIQUE,
  mp_order_id       text,
  amount_cents      integer NOT NULL,
  currency          char(3) DEFAULT 'BRL',
  status            payment_status DEFAULT 'pending',
  status_detail     text,
  payment_method    text,
  payment_type      text,
  installments      integer DEFAULT 1,
  card_last4        text,
  card_brand        text,
  paid_at           timestamptz,
  created_at        timestamptz DEFAULT now(),
  mp_raw_payload    jsonb
);
