import type { StoreProduct } from '@/lib/store/catalog';

export type StoreProductVariation = {
  name: string;
  options: string[];
};

export function parseStoreProductVariations(raw: unknown): StoreProductVariation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const name = (entry as { name?: unknown }).name;
    const options = (entry as { options?: unknown }).options;

    if (typeof name !== 'string' || !name.trim()) return [];
    if (!Array.isArray(options)) return [];

    const normalizedOptions = options
      .filter((option): option is string => typeof option === 'string')
      .map((option) => option.trim())
      .filter(Boolean);

    if (normalizedOptions.length === 0) return [];

    return [
      {
        name: name.trim(),
        options: normalizedOptions,
      },
    ];
  });
}

export function normalizeStoreProductVariations(
  variations: StoreProductVariation[]
): StoreProductVariation[] {
  const seenNames = new Set<string>();

  return variations.flatMap((variation) => {
    const name = variation.name.trim();
    if (!name) return [];

    const nameKey = name.toLocaleLowerCase('pt-BR');
    if (seenNames.has(nameKey)) return [];
    seenNames.add(nameKey);

    const options: string[] = [];
    const seenOptions = new Set<string>();

    for (const option of variation.options) {
      const trimmed = option.trim();
      if (!trimmed) continue;
      const optionKey = trimmed.toLocaleLowerCase('pt-BR');
      if (seenOptions.has(optionKey)) continue;
      seenOptions.add(optionKey);
      options.push(trimmed);
    }

    if (options.length === 0) return [];

    return [{ name, options }];
  });
}

export function productHasVariations(product: {
  variationsEnabled?: boolean;
  variations?: StoreProductVariation[];
}): boolean {
  return Boolean(
    product.variationsEnabled &&
      product.variations &&
      product.variations.length > 0
  );
}

export function stableSelectedOptionsKey(
  selectedOptions?: Record<string, string>
): string {
  if (!selectedOptions) return '';

  const entries = Object.entries(selectedOptions)
    .filter(([, value]) => value.trim().length > 0)
    .sort(([left], [right]) => left.localeCompare(right, 'pt-BR'));

  if (entries.length === 0) return '';

  return entries.map(([name, value]) => `${name}=${value}`).join('|');
}

export function cartLineId(line: {
  productId: string;
  selectedOptions?: Record<string, string>;
  itemUploads?: string[];
}): string {
  const optionsKey = stableSelectedOptionsKey(line.selectedOptions);
  const uploadsKey =
    line.itemUploads && line.itemUploads.length > 0
      ? line.itemUploads.join('|')
      : '';

  if (optionsKey && uploadsKey) {
    return `${line.productId}::${optionsKey}::u::${uploadsKey}`;
  }
  if (uploadsKey) {
    return `${line.productId}::u::${uploadsKey}`;
  }
  if (optionsKey) {
    return `${line.productId}::${optionsKey}`;
  }
  return line.productId;
}

export function formatVariationSummary(
  selectedOptions?: Record<string, string>
): string | undefined {
  if (!selectedOptions) return undefined;

  const parts = Object.entries(selectedOptions)
    .filter(([, value]) => value.trim().length > 0)
    .map(([name, value]) => `${name}: ${value}`);

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function formatProductNameWithVariations(
  name: string,
  selectedOptions?: Record<string, string>
): string {
  const summary = formatVariationSummary(selectedOptions);
  return summary ? `${name} (${summary})` : name;
}

export function validateSelectedProductOptions(
  product: Pick<StoreProduct, 'variationsEnabled' | 'variations' | 'name'>,
  selectedOptions?: Record<string, string>
): { ok: true } | { ok: false; error: string } {
  if (!productHasVariations(product)) {
    if (selectedOptions && Object.keys(selectedOptions).length > 0) {
      return { ok: false, error: `O produto ${product.name} não aceita variações.` };
    }
    return { ok: true };
  }

  const variations = product.variations ?? [];

  for (const variation of variations) {
    const selected = selectedOptions?.[variation.name]?.trim();
    if (!selected) {
      return {
        ok: false,
        error: `Selecione ${variation.name} para ${product.name}.`,
      };
    }

    if (!variation.options.includes(selected)) {
      return {
        ok: false,
        error: `A opção "${selected}" não está disponível para ${variation.name}.`,
      };
    }
  }

  return { ok: true };
}

export function buildSelectedOptionsFromForm(
  variations: StoreProductVariation[],
  formData: FormData
): Record<string, string> {
  const selected: Record<string, string> = {};

  for (const variation of variations) {
    const value = (formData.get(`variation_${variation.name}`) as string)?.trim();
    if (value) {
      selected[variation.name] = value;
    }
  }

  return selected;
}
