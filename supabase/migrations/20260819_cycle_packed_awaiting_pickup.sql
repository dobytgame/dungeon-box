-- Etapas entre "Em preparo" e "Enviado": caixa fechada e fila de coleta.

ALTER TYPE cycle_status ADD VALUE IF NOT EXISTS 'packed' AFTER 'preparing';
ALTER TYPE cycle_status ADD VALUE IF NOT EXISTS 'awaiting_pickup' AFTER 'packed';
