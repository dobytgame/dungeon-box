-- Destaque de feedback na landing page (moderação manual no admin)

ALTER TABLE user_feedback
  ADD COLUMN IF NOT EXISTS featured_on_lp boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_user_feedback_featured_on_lp
  ON user_feedback (featured_on_lp, created_at DESC)
  WHERE featured_on_lp = true;

COMMENT ON COLUMN user_feedback.featured_on_lp IS
  'Quando true, o feedback pode aparecer na seção de depoimentos da LP (requer mensagem).';

-- Recarrega o schema do PostgREST (evita queries falhando após ADD COLUMN)
NOTIFY pgrst, 'reload schema';
