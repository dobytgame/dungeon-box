-- Permite trocar o voto de tema 1 vez por enquete.
ALTER TABLE theme_votes
  ADD COLUMN IF NOT EXISTS change_count smallint NOT NULL DEFAULT 0
    CHECK (change_count >= 0 AND change_count <= 1);

COMMENT ON COLUMN theme_votes.change_count IS
  'Quantas vezes o assinante já trocou o voto nesta enquete. Máximo 1.';

NOTIFY pgrst, 'reload schema';
