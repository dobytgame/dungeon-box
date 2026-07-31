-- Notificações in-app do admin (pedidos da loja / status de pagamento)

CREATE TABLE IF NOT EXISTS admin_notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type           text NOT NULL CHECK (
    type IN (
      'store_order_payment_pending',
      'store_order_payment_approved',
      'store_order_payment_failed'
    )
  ),
  payment_id     uuid REFERENCES payments(id) ON DELETE CASCADE,
  order_id       text NOT NULL,
  user_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  title          text NOT NULL,
  body           text,
  amount_cents   integer,
  payment_method text,
  gateway        text,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created
  ON admin_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (created_at DESC)
  WHERE read_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_notifications_payment_type
  ON admin_notifications (payment_id, type)
  WHERE payment_id IS NOT NULL;
