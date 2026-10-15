ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS combo_auto_renew boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN subscriptions.combo_auto_renew IS
  'Combo: renovar automaticamente o mesmo pacote ao fim do pré-pago. false = encerra recorrência e zera fidelidade após prepaid_until.';
