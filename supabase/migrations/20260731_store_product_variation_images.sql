-- Imagens por opção nas variações de produto (retrocompatível com strings)

COMMENT ON COLUMN store_products.variations IS
  'Lista de variações: [{ "name": "Variedade", "options": [{ "label": "Chocolate", "imageUrl": "https://..." }] }]. Opções antigas em string continuam válidas.';
