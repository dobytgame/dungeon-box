-- Temas compráveis dos kits mensais avulsos da loja (independente do tema editorial da assinatura).

CREATE TABLE store_kit_themes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  kit_number  integer NOT NULL UNIQUE
                CHECK (kit_number >= 1),
  description text,
  image_url   text,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_kit_themes_active_sort_idx
  ON store_kit_themes (is_active, sort_order, kit_number);

COMMENT ON TABLE store_kit_themes IS
  'Temas que o cliente escolhe ao comprar kit do mês na loja.';

INSERT INTO store_kit_themes (slug, name, kit_number, sort_order, is_active)
VALUES
  ('ruinas', 'Ruínas', 1, 1, true),
  ('caverna', 'Caverna', 2, 2, true),
  ('tumba', 'Tumba', 3, 3, true);

ALTER TABLE store_kit_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "store_kit_themes_public_read"
  ON store_kit_themes
  FOR SELECT
  USING (is_active = true);
