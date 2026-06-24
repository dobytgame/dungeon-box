-- Coloca todos os ciclos de produção de volta em "Aguardando" (upcoming).
-- Não altera ciclos cancelados ou com falha de pagamento.

UPDATE subscription_cycles
SET
  status = 'upcoming',
  tracking_code = NULL,
  carrier = NULL,
  shipped_at = NULL,
  delivered_at = NULL,
  updated_at = now()
WHERE status IN ('production', 'preparing', 'shipped', 'delivered');
