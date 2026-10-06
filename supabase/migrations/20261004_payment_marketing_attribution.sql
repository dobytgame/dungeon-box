ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS marketing_attribution jsonb;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS marketing_attribution jsonb;

COMMENT ON COLUMN payments.marketing_attribution IS
  'UTM/fbclid capturados no checkout (sessão) no momento da venda.';

COMMENT ON COLUMN subscriptions.marketing_attribution IS
  'UTM/fbclid capturados no checkout de assinatura (copiados para pagamentos quando aplicável).';
