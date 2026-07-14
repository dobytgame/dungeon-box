-- Desconto personalizado para assinantes por produto (NULL = 5% padrão)

ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS subscriber_discount_percent integer;

COMMENT ON COLUMN store_products.subscriber_discount_percent IS
  'Percentual de desconto para assinantes ativos. NULL usa o padrão global de 5%.';
