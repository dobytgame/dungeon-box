-- Campanha UGC “Mostre sua Aventura”

CREATE TYPE ugc_content_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE ugc_reward_status AS ENUM ('none', 'queued', 'sent');
CREATE TYPE ugc_people_visibility AS ENUM ('none', 'adults', 'minors');
CREATE TYPE ugc_credit_preference AS ENUM ('name', 'instagram', 'both', 'none');

CREATE TABLE IF NOT EXISTS ugc_submissions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  instagram                text,
  context                  text NOT NULL,
  highlight                text,
  kit_theme_ids            uuid[] NOT NULL DEFAULT '{}',
  people_visible           ugc_people_visibility NOT NULL DEFAULT 'none',
  credit_preference        ugc_credit_preference NOT NULL DEFAULT 'none',
  content_status           ugc_content_status NOT NULL DEFAULT 'pending',
  reward_status            ugc_reward_status NOT NULL DEFAULT 'none',
  reward_cycle_id          uuid REFERENCES subscription_cycles(id) ON DELETE SET NULL,
  reject_reason            text,
  reviewer_id              uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at              timestamptz,
  review_note              text,
  consent_content_version  text NOT NULL,
  consent_content_at       timestamptz NOT NULL,
  consent_likeness_version text,
  consent_likeness_at      timestamptz,
  consent_reward_version   text NOT NULL,
  consent_reward_at        timestamptz NOT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ugc_media (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id  uuid NOT NULL REFERENCES ugc_submissions(id) ON DELETE CASCADE,
  storage_path   text NOT NULL,
  mime_type      text NOT NULL,
  byte_size      integer NOT NULL,
  original_name  text,
  sort_order     smallint NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ugc_media_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_ugc_submissions_status_created
  ON ugc_submissions (content_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ugc_submissions_user
  ON ugc_submissions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ugc_submissions_reward_cycle
  ON ugc_submissions (reward_cycle_id)
  WHERE reward_cycle_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ugc_media_submission
  ON ugc_media (submission_id, sort_order);

ALTER TABLE ugc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ugc_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ugc_submissions_select_own"
  ON ugc_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ugc_media_select_own"
  ON ugc_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ugc_submissions s
      WHERE s.id = submission_id AND s.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ugc-submissions',
  'ugc-submissions',
  false,
  8388608,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

COMMENT ON TABLE ugc_submissions IS
  'Envios da campanha Mostre sua Aventura (fotos da mesa + autorizações).';
COMMENT ON COLUMN ugc_submissions.consent_content_version IS
  'Versão do texto de autorização de uso aceita no envio.';
COMMENT ON COLUMN ugc_submissions.reward_cycle_id IS
  'Ciclo em que o brinde foi enfileirado, se houver.';

NOTIFY pgrst, 'reload schema';
