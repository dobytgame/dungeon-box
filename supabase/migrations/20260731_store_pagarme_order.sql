-- Loja multi-gateway: referência ao pedido Pagar.me (PIX / status)

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS pagarme_order_id text;

CREATE INDEX IF NOT EXISTS idx_payments_pagarme_order_id
  ON payments(pagarme_order_id)
  WHERE pagarme_order_id IS NOT NULL;
