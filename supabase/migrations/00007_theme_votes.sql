-- Votação de temas (assinantes com direito a voto)

CREATE TABLE theme_votes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES profiles(id),
  theme_option_id uuid,
  voted_at        timestamptz DEFAULT now(),
  UNIQUE(user_id, theme_option_id)
);
