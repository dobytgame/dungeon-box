-- =============================================================================
-- DungeonBox — Newsletter / lista de espera (LP de lançamento)
-- Use ESTE arquivo se o banco JÁ EXISTE (não rode EXECUTAR_NO_SUPABASE.sql de novo)
-- Supabase Dashboard → SQL Editor → Run
-- =============================================================================

CREATE TABLE IF NOT EXISTS newsletter_leads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  source      text NOT NULL DEFAULT 'launch_lp',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_leads_email_unique_idx
  ON newsletter_leads (email);

ALTER TABLE newsletter_leads ENABLE ROW LEVEL SECURITY;
