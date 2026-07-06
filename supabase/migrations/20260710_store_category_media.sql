-- Imagens de categoria: banner (página) e thumb (vitrine / slider)

ALTER TABLE store_categories
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS thumb_url text;

COMMENT ON COLUMN store_categories.banner_url IS
  'Banner largo da página da categoria (recomendado 1920×640px, proporção 21:9).';
COMMENT ON COLUMN store_categories.thumb_url IS
  'Miniatura quadrada para slider e cards na loja (recomendado 800×800px).';
