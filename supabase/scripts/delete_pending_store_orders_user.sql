-- Remove TODOS os pedidos de TESTE da loja do usuário (pendentes e aprovados).
-- O script anterior só apagava status = 'pending'; pedidos pagos continuam no admin.
-- Executar no SQL Editor do Supabase.

-- ========== 1) PREVIEW (todos os pedidos da loja deste usuário) ==========
SELECT
  id,
  status,
  amount_cents,
  payment_method,
  pagarme_charge_id,
  asaas_payment_id,
  paid_at,
  created_at,
  left(status_detail, 160) AS status_detail_preview
FROM payments
WHERE user_id = '3d03a1f4-af86-4592-a221-eaa630759676'
  AND status_detail ILIKE '%store_order%'
ORDER BY created_at DESC;

-- ========== 2) DELETE (pendentes + aprovados + recusados da loja) ==========
BEGIN;

-- Desvincula ciclos de assinatura que apontem para esses payments (FK sem CASCADE)
UPDATE subscription_cycles
SET payment_id = NULL
WHERE payment_id IN (
  SELECT id
  FROM payments
  WHERE user_id = '3d03a1f4-af86-4592-a221-eaa630759676'
    AND status_detail ILIKE '%store_order%'
);

DELETE FROM payments
WHERE user_id = '3d03a1f4-af86-4592-a221-eaa630759676'
  AND status_detail ILIKE '%store_order%';

COMMIT;

-- ========== 3) Conferir se limpou ==========
SELECT count(*) AS restantes
FROM payments
WHERE user_id = '3d03a1f4-af86-4592-a221-eaa630759676'
  AND status_detail ILIKE '%store_order%';
