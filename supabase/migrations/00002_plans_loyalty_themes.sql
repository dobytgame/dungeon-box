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
