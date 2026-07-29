/** Prazo máximo de produção sob demanda (site, loja, e-mails e termos). */
export const PRODUCTION_LEAD_BUSINESS_DAYS = 15;

export const SUBSCRIPTION_PRODUCTION_NOTE = `Prazo de produção de até ${PRODUCTION_LEAD_BUSINESS_DAYS} dias úteis após a confirmação do pagamento.`;

export const SUBSCRIPTION_DELIVERY_FAQ_ANSWER =
  `Cada kit é impresso após o pagamento — até ${PRODUCTION_LEAD_BUSINESS_DAYS} dias úteis de produção, mais o frete. ` +
  'Sul e Sudeste: 18–23 dias no total. Centro-Oeste e Nordeste: 23–28. Norte: 26–33.';

export const STORE_PRODUCTION_LEAD_TIME_LABEL = `Prazo de produção de até ${PRODUCTION_LEAD_BUSINESS_DAYS} dias úteis após a confirmação do pedido`;
