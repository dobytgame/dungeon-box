-- Variações de produto da loja (ex.: Cor, Tamanho)

ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS variations_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS variations jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN store_products.variations_enabled IS
  'Quando true, o cliente deve escolher as opções de variação antes de comprar.';
COMMENT ON COLUMN store_products.variations IS
  'Lista de variações: [{ "name": "Cor", "options": ["Vermelho", "Azul"] }].';
