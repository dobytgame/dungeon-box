export const STORE_SORT_OPTIONS = [
  { value: 'novidades', label: 'Mais recentes' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
] as const;

export type StoreSortOption = (typeof STORE_SORT_OPTIONS)[number]['value'];

export const STORE_PAGE_SIZE = 12;

export function parseStoreSort(value: string | undefined): StoreSortOption {
  if (value === 'menor-preco' || value === 'maior-preco' || value === 'novidades') {
    return value;
  }
  return 'novidades';
}

export function parseStorePage(value: string | undefined): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
