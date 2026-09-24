-- Completa a campanha Mostre sua Aventura: sessão, depoimento, tags e vídeo.

ALTER TABLE ugc_submissions
  ADD COLUMN IF NOT EXISTS rpg_system text,
  ADD COLUMN IF NOT EXISTS rpg_system_other text,
  ADD COLUMN IF NOT EXISTS player_count text,
  ADD COLUMN IF NOT EXISTS session_type text,
  ADD COLUMN IF NOT EXISTS session_type_other text,
  ADD COLUMN IF NOT EXISTS kit_other text,
  ADD COLUMN IF NOT EXISTS moment_highlight text,
  ADD COLUMN IF NOT EXISTS table_reaction text,
  ADD COLUMN IF NOT EXISTS liked_most text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS liked_most_other text,
  ADD COLUMN IF NOT EXISTS rpg_experience text,
  ADD COLUMN IF NOT EXISTS first_3d_set text,
  ADD COLUMN IF NOT EXISTS consent_guilda_version text,
  ADD COLUMN IF NOT EXISTS consent_guilda_at timestamptz,
  ADD COLUMN IF NOT EXISTS usage_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS marketing_potential text,
  ADD COLUMN IF NOT EXISTS marketing_notes text;

ALTER TABLE ugc_media
  ADD COLUMN IF NOT EXISTS duration_seconds numeric;

UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
WHERE id = 'ugc-submissions';

COMMENT ON COLUMN ugc_submissions.usage_tags IS
  'Canais de uso interno: instagram, site, anuncio, whatsapp, email, mesa_da_semana.';
COMMENT ON COLUMN ugc_submissions.marketing_potential IS
  'ugc_normal, destaque ou alto_potencial.';

NOTIFY pgrst, 'reload schema';
