-- Upgrade mensal → combo: termo pendente até confirmação do pagamento único.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS pending_billing_term text
    CHECK (
      pending_billing_term IS NULL
      OR pending_billing_term IN ('combo_3', 'combo_6', 'combo_12')
    );
