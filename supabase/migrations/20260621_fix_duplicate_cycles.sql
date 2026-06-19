-- Remove ciclos duplicados (mesmo subscription + cycle_number), mantendo o mais avançado.
DELETE FROM subscription_cycles AS dup
USING subscription_cycles AS keep
WHERE dup.subscription_id = keep.subscription_id
  AND dup.cycle_number = keep.cycle_number
  AND dup.id <> keep.id
  AND (
    CASE dup.status
      WHEN 'delivered' THEN 6
      WHEN 'shipped' THEN 5
      WHEN 'preparing' THEN 4
      WHEN 'upcoming' THEN 3
      WHEN 'failed' THEN 2
      WHEN 'cancelled' THEN 1
      ELSE 0
    END
  ) < (
    CASE keep.status
      WHEN 'delivered' THEN 6
      WHEN 'shipped' THEN 5
      WHEN 'preparing' THEN 4
      WHEN 'upcoming' THEN 3
      WHEN 'failed' THEN 2
      WHEN 'cancelled' THEN 1
      ELSE 0
    END
  );

-- Remove ciclos "aguardando" adiantados (ciclo 2+ sem pagamento com só 1 cobrança aprovada).
DELETE FROM subscription_cycles AS sc
WHERE sc.status = 'upcoming'
  AND sc.payment_id IS NULL
  AND sc.cycle_number > 1
  AND EXISTS (
    SELECT 1
    FROM subscriptions AS s
    WHERE s.id = sc.subscription_id
      AND s.status IN ('active', 'past_due')
  )
  AND (
    SELECT COUNT(*)
    FROM payments AS p
    WHERE p.subscription_id = sc.subscription_id
      AND p.status = 'approved'
  ) <= 1;

-- Corrige contador adiantado após 1º pagamento processado como renovação.
UPDATE subscriptions AS s
SET current_cycle = 1,
    updated_at = NOW()
WHERE s.status IN ('active', 'past_due')
  AND s.current_cycle > 1
  AND (
    SELECT COUNT(*)
    FROM payments AS p
    WHERE p.subscription_id = s.id
      AND p.status = 'approved'
  ) <= 1;

CREATE UNIQUE INDEX IF NOT EXISTS subscription_cycles_sub_cycle_unique
  ON subscription_cycles (subscription_id, cycle_number);
