-- Kits do mês: preço de loja (não assinante) distinto do preço da assinatura.
-- Assinantes continuam pagando plans.price_cents via lógica da aplicação.

UPDATE store_products
SET price_cents = 25900
WHERE category = 'monthly-kit'
  AND plan_slug = 'lendario'
  AND price_cents = 19900;
