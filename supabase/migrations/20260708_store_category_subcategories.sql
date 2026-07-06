-- Subcategorias da loja (hierarquia opcional em store_categories)

ALTER TABLE store_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES store_categories (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS store_categories_parent_id_idx
  ON store_categories (parent_id);

COMMENT ON COLUMN store_categories.parent_id IS
  'Categoria pai. NULL = categoria de topo exibida no menu da loja.';
