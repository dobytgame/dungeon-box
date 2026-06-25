-- Controle financeiro: categorias de gasto e lançamentos manuais

CREATE TYPE financial_expense_status AS ENUM (
  'pending',
  'paid',
  'cancelled'
);

CREATE TABLE financial_expense_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

INSERT INTO financial_expense_categories (id, name, sort_order) VALUES
  ('materia_prima', 'Matéria-prima', 10),
  ('embalagem',     'Embalagem', 20),
  ('envio',         'Frete e envio', 30),
  ('taxas',         'Taxas (gateway, banco)', 40),
  ('anuncios',      'Anúncios e mídia', 50),
  ('parcerias',     'Parcerias e influencers', 60),
  ('producao',      'Produção / mão de obra', 70),
  ('software',      'Software e ferramentas', 80),
  ('salarios',      'Salários e benefícios', 90),
  ('impostos',      'Impostos e tributos', 100),
  ('escritorio',    'Escritório e infra', 110),
  ('outros',        'Outros', 999);

CREATE TABLE financial_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   text NOT NULL REFERENCES financial_expense_categories(id),
  description   text NOT NULL,
  amount_cents  integer NOT NULL CHECK (amount_cents > 0),
  expense_date  date NOT NULL,
  paid_at       date,
  status        financial_expense_status NOT NULL DEFAULT 'paid',
  vendor        text,
  notes         text,
  payment_id    uuid REFERENCES payments(id) ON DELETE SET NULL,
  cycle_id      uuid REFERENCES subscription_cycles(id) ON DELETE SET NULL,
  created_by    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_financial_expenses_date
  ON financial_expenses(expense_date DESC);

CREATE INDEX idx_financial_expenses_paid
  ON financial_expenses(paid_at DESC)
  WHERE status = 'paid';

CREATE INDEX idx_financial_expenses_category
  ON financial_expenses(category_id);

CREATE INDEX idx_financial_expenses_status
  ON financial_expenses(status);
