-- Votação de tema do ciclo (a partir do ciclo 3)
-- Assinantes ativos escolhem entre 2 opções; 1 voto por usuário por ciclo.

CREATE TABLE IF NOT EXISTS theme_polls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_number  integer NOT NULL UNIQUE CHECK (cycle_number >= 3),
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT theme_polls_window CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS theme_options (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id       uuid NOT NULL REFERENCES theme_polls(id) ON DELETE CASCADE,
  name          text NOT NULL,
  image_url     text,
  sort_order    smallint NOT NULL CHECK (sort_order IN (1, 2)),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT theme_options_poll_slot UNIQUE (poll_id, sort_order)
);

CREATE INDEX IF NOT EXISTS idx_theme_options_poll ON theme_options (poll_id, sort_order);

-- Recria a tabela órfã (sem FK / unique por opção) para 1 voto por enquete.
DROP POLICY IF EXISTS "votes_select_own" ON theme_votes;
DROP POLICY IF EXISTS "votes_insert_own" ON theme_votes;
DROP POLICY IF EXISTS "votes_delete_own" ON theme_votes;
DROP TABLE IF EXISTS theme_votes;

CREATE TABLE theme_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  poll_id         uuid NOT NULL REFERENCES theme_polls(id) ON DELETE CASCADE,
  theme_option_id uuid NOT NULL REFERENCES theme_options(id) ON DELETE CASCADE,
  voted_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT theme_votes_one_per_user_poll UNIQUE (user_id, poll_id)
);

CREATE INDEX IF NOT EXISTS idx_theme_votes_poll ON theme_votes (poll_id, theme_option_id);
CREATE INDEX IF NOT EXISTS idx_theme_votes_user ON theme_votes (user_id, voted_at DESC);

ALTER TABLE theme_polls   ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE theme_votes   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "theme_polls_authenticated_read" ON theme_polls
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "theme_options_authenticated_read" ON theme_options
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "votes_select_own" ON theme_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "votes_insert_own" ON theme_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE theme_polls IS
  'Enquete de tema por ciclo (a partir do 3). Janela starts_at/ends_at em Brasília.';
COMMENT ON TABLE theme_options IS
  'Duas opções de tema por enquete, com nome e arte.';
COMMENT ON TABLE theme_votes IS
  'Um voto por assinante ativo em cada enquete de ciclo.';

NOTIFY pgrst, 'reload schema';
