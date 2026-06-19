-- Frete passa a ser cobrado por padrão em todos os planos.
-- Frete grátis só via promoção comercial (freight_free no plano) ou cupom free_shipping.

UPDATE plans
SET freight_free = false,
    freight_regions = NULL
WHERE freight_free = true;

ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_type_check;
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_value_check;
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_percent_range;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_discount_type_check
  CHECK (discount_type IN ('percent', 'fixed', 'free_shipping'));

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_discount_value_check
  CHECK (
    (discount_type = 'free_shipping' AND discount_value = 0)
    OR (discount_type <> 'free_shipping' AND discount_value > 0)
  );

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_percent_range CHECK (
    discount_type <> 'percent'
    OR (discount_value > 0 AND discount_value <= 100)
  );
