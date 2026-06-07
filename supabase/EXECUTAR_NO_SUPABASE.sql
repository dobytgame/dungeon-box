-- =============================================================================
-- DungeonBox — Schema completo do sistema de assinatura
-- Cole este arquivo no Supabase Dashboard → SQL Editor → Run
-- Projeto NOVO (executar uma única vez)
-- =============================================================================

-- DungeonBox · enums e extensões base

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE subscription_status AS ENUM (
  'pending',
  'active',
  'paused',
  'past_due',
  'cancelled',
  'expired'
);

CREATE TYPE cycle_status AS ENUM (
  'upcoming',
  'preparing',
  'shipped',
  'delivered',
  'failed'
);

CREATE TYPE payment_status AS ENUM (
  'pending',
  'approved',
  'authorized',
  'in_process',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back'
);
-- Planos, fidelidade e temas (sem FK externa)

CREATE TABLE plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  description     text,
  price_cents     integer NOT NULL,
  pieces_min      integer NOT NULL,
  pieces_max      integer NOT NULL,
  color_choices   integer NOT NULL DEFAULT 1,
  freight_free    boolean NOT NULL DEFAULT false,
  freight_regions text[],
  store_discount  integer NOT NULL DEFAULT 0,
  has_vip_group   boolean NOT NULL DEFAULT false,
  has_vote        boolean NOT NULL DEFAULT false,
  accent_color    text,
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now()
);

INSERT INTO plans (
  slug, name, price_cents, pieces_min, pieces_max, color_choices,
  freight_free, freight_regions, store_discount, has_vip_group, has_vote, accent_color, sort_order
) VALUES
  ('aventureiro', 'Aventureiro', 8900,  10, 12, 1, false, NULL,                    0,  false, false, '#a0aabb', 1),
  ('heroi',       'Herói',       13900, 18, 22, 2, true,  ARRAY['sul','sudeste'], 5,  true,  false, '#ff6b2b', 2),
  ('lendario',    'Lendário',    19900, 28, 35, 99, true,  ARRAY['all'],          10, true,  true,  '#00d4ff', 3);

CREATE TABLE loyalty_levels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level           integer UNIQUE NOT NULL,
  name            text NOT NULL,
  icon            text,
  min_cycles      integer NOT NULL,
  bonus_pieces    integer DEFAULT 0,
  store_discount  integer DEFAULT 0,
  has_vote        boolean DEFAULT false,
  has_exclusive   boolean DEFAULT false,
  description     text
);

INSERT INTO loyalty_levels (level, name, icon, min_cycles, bonus_pieces, store_discount, has_vote, has_exclusive) VALUES
  (1, 'Recruta',     '🗡️', 0,  0, 0,  false, false),
  (2, 'Aventureiro', '⚔️', 2,  1, 5,  false, false),
  (3, 'Veterano',    '🏹', 5,  2, 10, true,  false),
  (4, 'Campeão',     '🛡️', 9,  3, 15, true,  false),
  (5, 'Lendário',    '👑', 12, 5, 20, true,  true);

CREATE TABLE themes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_number integer NOT NULL,
  year         integer NOT NULL,
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  lore         text,
  emoji        text,
  image_url    text,
  is_active    boolean DEFAULT false,
  is_revealed  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(month_number, year)
);
-- Perfis (extensão auth.users) e endereços

CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  full_name       text,
  display_name    text,
  avatar_url      text,
  phone           text,
  cpf             text,
  birth_date      date,
  preferred_color text DEFAULT 'cinza-pedra',
  newsletter      boolean DEFAULT true,
  is_admin        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE addresses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  label        text DEFAULT 'Principal',
  recipient    text NOT NULL,
  zip_code     text NOT NULL,
  street       text NOT NULL,
  number       text NOT NULL,
  complement   text,
  neighborhood text NOT NULL,
  city         text NOT NULL,
  state        char(2) NOT NULL,
  is_default   boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX one_default_address
  ON addresses (user_id)
  WHERE is_default = true;
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
-- Votação de temas (assinantes com direito a voto)

CREATE TABLE theme_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id),
  theme_option_id uuid,
  voted_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, theme_option_id)
);
-- Views operacionais

CREATE VIEW active_subscribers WITH (security_invoker = true) AS
SELECT
  p.id,
  p.full_name,
  p.email,
  pl.name        AS plan_name,
  pl.price_cents AS plan_price,
  s.status,
  s.current_cycle,
  s.loyalty_level,
  ll.name        AS loyalty_name,
  s.next_billing_date,
  s.started_at
FROM subscriptions s
JOIN profiles p  ON p.id = s.user_id
JOIN plans pl    ON pl.id = s.plan_id
JOIN loyalty_levels ll ON ll.level = s.loyalty_level
WHERE s.status = 'active';

CREATE VIEW mrr WITH (security_invoker = true) AS
SELECT
  pl.name,
  COUNT(s.id)               AS subscribers,
  SUM(pl.price_cents) / 100 AS mrr_brl
FROM subscriptions s
JOIN plans pl ON pl.id = s.plan_id
WHERE s.status = 'active'
GROUP BY pl.name;
-- Row Level Security

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_votes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans               ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_levels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE themes              ENABLE ROW LEVEL SECURITY;

-- Leitura pública
CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (true);

CREATE POLICY "loyalty_public_read" ON loyalty_levels
  FOR SELECT USING (true);

CREATE POLICY "themes_public_read" ON themes
  FOR SELECT USING (is_revealed = true);

-- Perfis (insert via trigger handle_new_user SECURITY DEFINER)
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Endereços
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "addresses_delete_own" ON addresses
  FOR DELETE USING (auth.uid() = user_id);

-- Assinaturas
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "subscriptions_insert_own" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions_update_own" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ciclos e pagamentos (escrita via service role nos webhooks)
CREATE POLICY "cycles_select_own" ON subscription_cycles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = subscription_id AND s.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_select_own" ON payments
  FOR SELECT USING (auth.uid() = user_id);

-- Votos
CREATE POLICY "votes_select_own" ON theme_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "votes_insert_own" ON theme_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_delete_own" ON theme_votes
  FOR DELETE USING (auth.uid() = user_id);
