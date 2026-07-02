-- Categorias da loja + mídia e conteúdo HTML dos produtos

CREATE TABLE store_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX store_categories_active_sort_idx
  ON store_categories (is_active, sort_order);

INSERT INTO store_categories (slug, name, description, sort_order) VALUES
  ('kits-pintura', 'Kits de pintura', 'Acessórios e materiais para pintura de miniaturas', 1),
  ('kits-mes', 'Kits do mês', 'Cópias extras do kit mensal para assinantes', 2);

ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS store_category_id uuid REFERENCES store_categories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS gallery_urls text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS page_content_html text;

CREATE INDEX store_products_store_category_idx
  ON store_products (store_category_id)
  WHERE store_category_id IS NOT NULL;

UPDATE store_products
SET store_category_id = (SELECT id FROM store_categories WHERE slug = 'kits-pintura' LIMIT 1)
WHERE category = 'paint-kit' AND store_category_id IS NULL;

UPDATE store_products
SET store_category_id = (SELECT id FROM store_categories WHERE slug = 'kits-mes' LIMIT 1)
WHERE category = 'monthly-kit' AND store_category_id IS NULL;

COMMENT ON TABLE store_categories IS
  'Categorias merchandising da loja (agrupamento no site).';
COMMENT ON COLUMN store_products.store_category_id IS
  'Categoria de vitrine; distinto de category (paint-kit | monthly-kit).';
COMMENT ON COLUMN store_products.page_content_html IS
  'Conteúdo HTML da página do produto no site.';

-- Bucket público para imagens da loja (upload via service role no admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-media',
  'store-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "store_media_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'store-media');
