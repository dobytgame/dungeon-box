-- Novo tipo de produto: itens gerais da loja (acessórios, cenários, etc.)

ALTER TABLE store_products
  DROP CONSTRAINT IF EXISTS store_products_category_check;

ALTER TABLE store_products
  ADD CONSTRAINT store_products_category_check
  CHECK (category IN ('paint-kit', 'monthly-kit', 'store-item'));

COMMENT ON COLUMN store_products.category IS
  'paint-kit: kit de pintura | monthly-kit: kit do mês por plano | store-item: produto avulso da loja';
