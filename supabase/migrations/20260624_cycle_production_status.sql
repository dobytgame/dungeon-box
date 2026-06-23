-- Etapa "Produção" na fila operacional (entre aguardando e em preparo).

ALTER TYPE cycle_status ADD VALUE IF NOT EXISTS 'production' AFTER 'upcoming';
