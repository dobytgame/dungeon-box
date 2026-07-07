-- Reparo pontual: incoerências combo Asaas × payments (auditoria 2026-07-07).
-- Idempotente: pode rodar mais de uma vez sem duplicar efeito.

-- 1) combo_prepaid gravado com valor da 1ª parcela em vez do total
UPDATE payments
SET
  amount_cents = 201388,
  installments = 4,
  status_detail = '{"type":"combo_prepaid","billing_term":"combo_12","combo_total_cents":201388,"combo_installments":4,"repaired_at":"2026-07-11"}'
WHERE id = 'f7693636-24b9-4dc7-ab73-efc288acb99d'
  AND subscription_id = '3d62ae2e-683e-4800-ab8f-71d2361490f6'
  AND amount_cents = 50347;

UPDATE payments
SET
  amount_cents = 49432,
  installments = 3,
  status_detail = '{"type":"combo_prepaid","billing_term":"combo_3","combo_total_cents":49432,"combo_installments":3,"repaired_at":"2026-07-11"}'
WHERE id = '6795cf0a-6960-42bf-bfff-3fe9217f133f'
  AND subscription_id = '3f378a5c-096c-4024-96aa-4bc4c2de71ef'
  AND amount_cents = 16477;

-- 2) Pedro Melo: manter 1 combo_prepaid; demais viram parcelas (não somam na receita)
UPDATE payments
SET
  amount_cents = 14775,
  status_detail = '{"type":"combo_installment_slice","imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = '94998779-dd39-4614-b8d1-13a921fcf82f'
  AND subscription_id = 'a02caf7f-2736-4683-a745-701f0f8a6628'
  AND status_detail ILIKE '%combo_prepaid%';

UPDATE payments
SET
  amount_cents = 14775,
  status_detail = '{"type":"combo_installment_slice","imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = 'bad4c176-ebd2-44ad-ac10-963c8ba5f8c4'
  AND subscription_id = 'a02caf7f-2736-4683-a745-701f0f8a6628'
  AND status_detail ILIKE '%combo_prepaid%';

UPDATE payments
SET
  amount_cents = 14778,
  status_detail = '{"type":"combo_installment_slice","imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = '8fb5e3eb-28fc-4a38-b495-cf1d9f3344db'
  AND subscription_id = 'a02caf7f-2736-4683-a745-701f0f8a6628'
  AND status_detail ILIKE '%combo_prepaid%';

UPDATE payments
SET
  status_detail = '{"type":"combo_prepaid","billing_term":"combo_3","combo_total_cents":59103,"combo_installments":4,"imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = 'c95b4636-ee98-4938-a060-5ccd3f7831e8'
  AND subscription_id = 'a02caf7f-2736-4683-a745-701f0f8a6628';

-- 3) Victor Heck: parcelas importadas como slices
UPDATE payments
SET status_detail = '{"type":"combo_installment_slice","imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id IN (
  'e223f8a3-8db1-4006-9eb6-87821dedab1b',
  'e7477b0a-38ea-439a-813c-0a0027f3e4f8',
  '06b3f0b4-017e-4930-a52c-52533fc96507'
)
AND subscription_id = 'f3fccfa8-42b6-4566-bcae-c7f3df7302b3'
AND status_detail NOT ILIKE '%combo_installment_slice%';

UPDATE payments
SET
  status_detail = '{"type":"combo_prepaid","billing_term":"combo_3","combo_total_cents":68832,"combo_installments":4,"imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = '1ba4fe57-2ce9-4b83-96ed-ff6503822903'
  AND subscription_id = 'f3fccfa8-42b6-4566-bcae-c7f3df7302b3';

-- 4) Ana Júlia: parcelas como slices + combo canônico
UPDATE payments
SET status_detail = '{"type":"combo_installment_slice","imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id IN (
  'ac37f0fc-7e89-4988-ab3e-e480daf49957',
  'c0b38352-9dcd-4a01-bab2-0ab7681e3a49',
  '3d71f909-c0ff-43a9-8bb4-64cb75083071'
)
AND subscription_id = 'e7812ea5-5a75-48bd-9d77-5c4dd4e92aa7'
AND status_detail NOT ILIKE '%combo_installment_slice%';

UPDATE payments
SET
  status_detail = '{"type":"combo_prepaid","billing_term":"combo_3","combo_total_cents":29403,"combo_installments":4,"imported_from_asaas":true,"repaired_at":"2026-07-11"}'
WHERE id = 'f0ad0a50-2a5c-446c-bdf2-80031e65bfaf'
  AND subscription_id = 'e7812ea5-5a75-48bd-9d77-5c4dd4e92aa7';

-- 5) Cobranças futuras importadas por engano (renovação mensal de cliente combo)
UPDATE payments
SET
  status = 'cancelled',
  status_detail = '{"type":"cancelled_future_charge","repaired_at":"2026-07-11"}'
WHERE asaas_payment_id IN (
  'pay_86592kkfm8g9g8o1',
  'pay_6gpdqhutjaunlthk',
  'pay_fa19uvuoo89pkba0',
  'pay_su8syhnjradyiag9',
  'pay_dzkum55nnubbbqrb'
)
AND status = 'pending';

-- 6) Lordseth: combo confirmado no Asaas ausente no banco
INSERT INTO payments (
  id,
  user_id,
  subscription_id,
  asaas_payment_id,
  amount_cents,
  currency,
  status,
  status_detail,
  installments,
  paid_at,
  created_at
)
SELECT
  '431aff2c-a4ac-4b65-9ead-3144bfe7ad01'::uuid,
  '69fc2a2c-d51e-486b-a212-49a22d8e687d'::uuid,
  '431aff2c-a4ac-4b65-9ead-3144bfe7ad68'::uuid,
  'repair_lordseth_combo_431aff2c',
  39150,
  'BRL',
  'approved',
  '{"type":"combo_prepaid","billing_term":"combo_3","combo_total_cents":39150,"combo_installments":4,"repaired_from_asaas_export":true,"repaired_at":"2026-07-11"}',
  4,
  '2026-07-07 15:00:00+00'::timestamptz,
  now()
WHERE NOT EXISTS (
  SELECT 1
  FROM payments
  WHERE subscription_id = '431aff2c-a4ac-4b65-9ead-3144bfe7ad68'
    AND status = 'approved'
    AND status_detail ILIKE '%combo_prepaid%'
);

-- 7) Vincular ciclo 1 do Lordseth ao pagamento do combo
UPDATE subscription_cycles sc
SET
  payment_id = p.id,
  updated_at = now()
FROM payments p
WHERE sc.id = '0e44ec7c-bf46-4031-829d-1fc07b989dfb'
  AND p.subscription_id = '431aff2c-a4ac-4b65-9ead-3144bfe7ad68'
  AND p.status = 'approved'
  AND p.status_detail ILIKE '%combo_prepaid%'
  AND sc.payment_id IS NULL;
