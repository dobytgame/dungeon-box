ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS combo_auto_renew boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN subscriptions.combo_auto_renew IS
  'Combo: renovar automaticamente o mesmo pacote ao fim do pré-pago. false = encerra recorrência e zera fidelidade após prepaid_until.';

-- Assinantes combo existentes entram no fluxo de renovação automática (podem desligar no dashboard).
UPDATE subscriptions
SET combo_auto_renew = true
WHERE billing_term IN ('combo_3', 'combo_6', 'combo_12')
  AND combo_auto_renew IS DISTINCT FROM true;
