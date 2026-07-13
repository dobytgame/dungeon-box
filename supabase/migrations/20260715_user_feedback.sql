-- Feedback dos usuários (avaliação pós-entrega)

CREATE TABLE IF NOT EXISTS user_feedback (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription_cycle_id uuid NOT NULL REFERENCES subscription_cycles(id) ON DELETE CASCADE,
  rating                smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  message               text,
  image_paths           text[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_feedback_one_per_cycle UNIQUE (user_id, subscription_cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_feedback_cycle ON user_feedback (subscription_cycle_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback (rating);

ALTER TABLE subscription_cycles
  ADD COLUMN IF NOT EXISTS feedback_request_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_cycles_feedback_request_pending
  ON subscription_cycles (delivered_at)
  WHERE status = 'delivered' AND feedback_request_sent_at IS NULL;

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_feedback_select_own"
  ON user_feedback FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_feedback_insert_own"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Bucket privado — upload via service role na API
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-feedback',
  'user-feedback',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE user_feedback IS 'Avaliações dos clientes após entrega do ciclo.';
COMMENT ON COLUMN subscription_cycles.feedback_request_sent_at IS
  'Quando o e-mail de solicitação de feedback foi enviado.';
