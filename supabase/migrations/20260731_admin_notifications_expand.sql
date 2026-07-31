-- Expande notificações admin: assinaturas + coluna subscription_id

ALTER TABLE admin_notifications
  ADD COLUMN IF NOT EXISTS subscription_id uuid REFERENCES subscriptions(id) ON DELETE CASCADE;

ALTER TABLE admin_notifications
  DROP CONSTRAINT IF EXISTS admin_notifications_type_check;

ALTER TABLE admin_notifications
  ADD CONSTRAINT admin_notifications_type_check CHECK (
    type IN (
      'store_order_payment_pending',
      'store_order_payment_approved',
      'store_order_payment_failed',
      'subscription_pending',
      'subscription_activated',
      'subscription_payment_failed',
      'subscription_renewal_paid',
      'subscription_cancelled'
    )
  );

CREATE INDEX IF NOT EXISTS idx_admin_notifications_subscription
  ON admin_notifications (subscription_id, created_at DESC)
  WHERE subscription_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_subscription_type
  ON admin_notifications (subscription_id, type)
  WHERE subscription_id IS NOT NULL AND payment_id IS NULL;
