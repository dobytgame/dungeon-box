-- Produtos personalizados: quantidade mínima e upload de imagem por unidade

ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS min_quantity integer NOT NULL DEFAULT 1
    CHECK (min_quantity >= 1),
  ADD COLUMN IF NOT EXISTS requires_unit_uploads boolean NOT NULL DEFAULT false;

ALTER TABLE store_products
  DROP CONSTRAINT IF EXISTS store_products_min_max_quantity;

ALTER TABLE store_products
  ADD CONSTRAINT store_products_min_max_quantity
  CHECK (min_quantity <= max_quantity);

COMMENT ON COLUMN store_products.min_quantity IS
  'Quantidade mínima por pedido (ex.: personalizados com mínimo de 5 unidades).';

COMMENT ON COLUMN store_products.requires_unit_uploads IS
  'Quando true, o cliente deve enviar 1 imagem por unidade antes de comprar.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-customizations',
  'store-customizations',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
