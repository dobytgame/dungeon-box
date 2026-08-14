-- Produtos da loja (kits de pintura + config de kits avulsos por plano)

CREATE TABLE store_products (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  name                  text NOT NULL,
  tagline               text,
  category              text NOT NULL CHECK (category IN ('paint-kit', 'monthly-kit')),
  price_cents           integer NOT NULL CHECK (price_cents >= 0),
  production_cost_cents integer NOT NULL DEFAULT 0 CHECK (production_cost_cents >= 0),
  includes              text[] NOT NULL DEFAULT '{}',
  paint_kit_bump_id     text CHECK (
    paint_kit_bump_id IS NULL OR paint_kit_bump_id IN ('amador', 'profissional')
  ),
  plan_slug             text REFERENCES plans (slug) ON DELETE SET NULL,
  max_quantity          integer NOT NULL DEFAULT 9 CHECK (max_quantity > 0),
  featured              boolean NOT NULL DEFAULT false,
  is_active             boolean NOT NULL DEFAULT true,
  sort_order            integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_products_monthly_kit_plan CHECK (
    category <> 'monthly-kit' OR plan_slug IS NOT NULL
  ),
  CONSTRAINT store_products_paint_kit_bump CHECK (
    category <> 'paint-kit' OR paint_kit_bump_id IS NOT NULL
  )
);

CREATE INDEX store_products_category_active_idx
  ON store_products (category, is_active, sort_order);

INSERT INTO store_products (
  slug,
  name,
  tagline,
  category,
  price_cents,
  production_cost_cents,
  includes,
  paint_kit_bump_id,
  sort_order,
  featured
) VALUES
  (
    'kit-pintura-amador',
    'Kit de Pintura Amador',
    'Ideal para quem está começando a pintar minis',
    'paint-kit',
    4900,
    0,
    ARRAY[
      '3 tintas acrílicas base (cinza, marrom, preto)',
      '2 pincéis essenciais'
    ],
    'amador',
    1,
    false
  ),
  (
    'kit-pintura-profissional',
    'Kit de Pintura Profissional',
    'Acabamento de mesa com qualidade de loja',
    'paint-kit',
    9999,
    0,
    ARRAY[
      '5 pincéis de detalhe profissional'
    ],
    'profissional',
    2,
    true
  );

INSERT INTO store_products (
  slug,
  name,
  tagline,
  category,
  price_cents,
  production_cost_cents,
  includes,
  plan_slug,
  sort_order,
  is_active
)
SELECT
  'kit-avulso-' || slug,
  'Kit do mês — ' || name,
  'Envio junto com a próxima caixa — sem frete extra',
  'monthly-kit',
  price_cents,
  production_cost_cents,
  ARRAY['Conteúdo completo do plano ' || name],
  slug,
  sort_order + 10,
  is_active
FROM plans;

COMMENT ON TABLE store_products IS
  'Catálogo administrável da loja: kits de pintura e kits avulsos por plano.';
