-- Reatribui pagamentos aprovados aos ciclos 1..N (mensal) e corrige current_cycle.
-- Regra: contratação = ciclo 1, 1ª renovação = ciclo 2, etc.

CREATE OR REPLACE FUNCTION repair_monthly_subscription_cycles(p_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_billing_term text;
  v_payment record;
  v_cycle int := 0;
  v_expected_current int;
  v_last_paid timestamptz;
BEGIN
  SELECT billing_term INTO v_billing_term
  FROM subscriptions
  WHERE id = p_subscription_id;

  IF v_billing_term IS NULL OR v_billing_term LIKE 'combo%' THEN
    RETURN;
  END IF;

  -- Restaura paid_at corrompido a partir do ciclo mais antigo que referencia o pagamento
  UPDATE payments p
  SET paid_at = src.canonical_paid_at
  FROM (
    SELECT sc.payment_id,
           MIN(sc.paid_at) AS canonical_paid_at
    FROM subscription_cycles sc
    WHERE sc.subscription_id = p_subscription_id
      AND sc.payment_id IS NOT NULL
      AND sc.paid_at IS NOT NULL
    GROUP BY sc.payment_id
  ) src
  WHERE p.id = src.payment_id
    AND p.paid_at > src.canonical_paid_at + interval '1 day';

  -- Limpa vínculos de pagamento em todos os ciclos antes de reatribuir
  UPDATE subscription_cycles
  SET payment_id = NULL,
      paid_at = NULL,
      amount_cents = NULL,
      updated_at = now()
  WHERE subscription_id = p_subscription_id;

  -- Um pagamento aprovado por mês calendário (maior valor em caso de duplicata no checkout)
  FOR v_payment IN
    WITH ranked AS (
      SELECT p.id,
             p.amount_cents,
             COALESCE(p.paid_at, p.created_at) AS effective_paid_at,
             date_trunc('month', COALESCE(p.paid_at, p.created_at) AT TIME ZONE 'America/Sao_Paulo') AS billing_month,
             ROW_NUMBER() OVER (
               PARTITION BY date_trunc('month', COALESCE(p.paid_at, p.created_at) AT TIME ZONE 'America/Sao_Paulo')
               ORDER BY p.amount_cents DESC NULLS LAST,
                        COALESCE(p.paid_at, p.created_at),
                        p.id
             ) AS rn
      FROM payments p
      WHERE p.subscription_id = p_subscription_id
        AND p.status = 'approved'
    )
    SELECT id, amount_cents, effective_paid_at
    FROM ranked
    WHERE rn = 1
    ORDER BY effective_paid_at, id
  LOOP
    v_cycle := v_cycle + 1;
    v_last_paid := v_payment.effective_paid_at;

    INSERT INTO subscription_cycles (
      subscription_id, cycle_number, status, payment_id, paid_at, amount_cents, updated_at
    )
    VALUES (
      p_subscription_id, v_cycle, 'upcoming', v_payment.id, v_payment.effective_paid_at,
      v_payment.amount_cents, now()
    )
    ON CONFLICT (subscription_id, cycle_number)
    DO UPDATE SET
      payment_id = EXCLUDED.payment_id,
      paid_at = EXCLUDED.paid_at,
      amount_cents = EXCLUDED.amount_cents,
      updated_at = now();
  END LOOP;

  IF v_cycle = 0 THEN
    RETURN;
  END IF;

  v_expected_current := v_cycle + 1;

  -- Remove ciclos vazios além do próximo aguardando pagamento
  DELETE FROM subscription_cycles
  WHERE subscription_id = p_subscription_id
    AND cycle_number > v_expected_current
    AND payment_id IS NULL;

  -- Garante ciclo aguardando próximo pagamento
  INSERT INTO subscription_cycles (subscription_id, cycle_number, status, updated_at)
  VALUES (p_subscription_id, v_expected_current, 'upcoming', now())
  ON CONFLICT (subscription_id, cycle_number) DO NOTHING;

  UPDATE subscriptions
  SET current_cycle = v_expected_current,
      loyalty_level = LEAST(12, GREATEST(1, v_cycle)),
      next_billing_date = v_last_paid + interval '1 month',
      current_period_end = v_last_paid + interval '1 month',
      updated_at = now()
  WHERE id = p_subscription_id;
END;
$$;

DO $$
DECLARE
  sub_id uuid;
BEGIN
  FOR sub_id IN
    SELECT id
    FROM subscriptions
    WHERE status IN ('active', 'past_due', 'cancelled')
      AND (billing_term IS NULL OR billing_term = 'monthly')
  LOOP
    PERFORM repair_monthly_subscription_cycles(sub_id);
  END LOOP;
END;
$$;
