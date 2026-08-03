-- Corrige paid_at sobrescrito pelo import Asaas (paymentDate virava meia-noite UTC).
UPDATE payments
SET paid_at = created_at
WHERE status = 'approved'
  AND paid_at IS NOT NULL
  AND paid_at::time = '00:00:00'
  AND status_detail LIKE '%imported_from_asaas%'
  AND paid_at::date > created_at::date + 7;
