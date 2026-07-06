-- Banners do hero slider da loja

CREATE TABLE store_banners (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  subtitle    text,
  cta_label   text,
  cta_href    text,
  image_url   text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_banners_active_sort_idx
  ON store_banners (is_active, sort_order);

INSERT INTO store_banners (title, subtitle, cta_label, cta_href, sort_order) VALUES
  (
    'Extras para sua mesa de RPG',
    'Kits de pintura e acessórios com a qualidade DungeonBox',
    'Ver produtos',
    '/loja#produtos',
    1
  ),
  (
    'Cópias extras do kit do mês',
    'Assinantes podem comprar mais unidades — frete grátis na próxima caixa',
    'Assinar agora',
    '/#planos',
    2
  ),
  (
    'Monte sua dungeon do zero',
    'A assinatura mensal entrega peças modulares todo mês',
    'Conhecer planos',
    '/#planos',
    3
  );

COMMENT ON TABLE store_banners IS
  'Slides do hero slider da home da loja (/loja).';
