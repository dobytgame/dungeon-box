import type { StoreProduct } from '@/lib/store/catalog';

export type StoreProductVariationOption = {
  label: string;
  imageUrl?: string;
};

export type StoreProductVariation = {
  name: string;
  options: StoreProductVariationOption[];
};

function parseVariationOption(raw: unknown): StoreProductVariationOption | null {
  if (typeof raw === 'string') {
    const label = raw.trim();
    return label ? { label } : null;
  }

  if (!raw || typeof raw !== 'object') return null;

  const label = (raw as { label?: unknown }).label;
  if (typeof label !== 'string' || !label.trim()) return null;

  const imageUrl = (raw as { imageUrl?: unknown }).imageUrl;
  const normalizedImageUrl =
    typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : undefined;

  return {
    label: label.trim(),
    ...(normalizedImageUrl ? { imageUrl: normalizedImageUrl } : {}),
  };
}

export function getVariationOptionLabel(option: StoreProductVariationOption): string {
  return option.label;
}

export function findVariationOption(
  variation: StoreProductVariation,
  label: string
): StoreProductVariationOption | undefined {
  const key = label.trim().toLocaleLowerCase('pt-BR');
  return variation.options.find(
    (option) => option.label.toLocaleLowerCase('pt-BR') === key
  );
}

/** URLs de imagem das opções de variação, na ordem cadastrada, sem duplicatas. */
export function collectVariationImageUrls(
  variations: StoreProductVariation[] | undefined
): string[] {
  if (!variations?.length) return [];

  const urls: string[] = [];
  const seen = new Set<string>();

  for (const variation of variations) {
    for (const option of variation.options) {
      const imageUrl = option.imageUrl?.trim();
      if (!imageUrl || seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      urls.push(imageUrl);
    }
  }

  return urls;
}

export function parseStoreProductVariations(raw: unknown): StoreProductVariation[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];

    const name = (entry as { name?: unknown }).name;
    const options = (entry as { options?: unknown }).options;

    if (typeof name !== 'string' || !name.trim()) return [];
    if (!Array.isArray(options)) return [];

    const normalizedOptions = options
      .map(parseVariationOption)
      .filter((option): option is StoreProductVariationOption => Boolean(option));

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

    const options: StoreProductVariationOption[] = [];
    const seenOptions = new Set<string>();

    for (const option of variation.options) {
      const label = option.label.trim();
      if (!label) continue;
      const optionKey = label.toLocaleLowerCase('pt-BR');
      if (seenOptions.has(optionKey)) continue;
      seenOptions.add(optionKey);

      const imageUrl = option.imageUrl?.trim();
      options.push({
        label,
        ...(imageUrl ? { imageUrl } : {}),
      });
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

/** Produto com uma única dimensão de variação (ex.: variedades com imagem). */
export function productHasSingleVariation(product: {
  variationsEnabled?: boolean;
  variations?: StoreProductVariation[];
}): boolean {
  return productHasVariations(product) && (product.variations?.length ?? 0) === 1;
}

export function resolveSelectedVariationImage(
  product: Pick<StoreProduct, 'variationsEnabled' | 'variations'>,
  selectedOptions?: Record<string, string>
): string | undefined {
  if (!selectedOptions || !productHasVariations(product)) return undefined;

  for (const variation of product.variations ?? []) {
    const selected = selectedOptions[variation.name]?.trim();
    if (!selected) continue;

    const option = findVariationOption(variation, selected);
    if (option?.imageUrl) return option.imageUrl;
  }

  return undefined;
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
  themeId?: string;
}): string {
  const optionsKey = stableSelectedOptionsKey(line.selectedOptions);
  const uploadsKey =
    line.itemUploads && line.itemUploads.length > 0
      ? line.itemUploads.join('|')
      : '';
  const themeKey = line.themeId?.trim() ?? '';

  const extras = [optionsKey, uploadsKey ? `u::${uploadsKey}` : '', themeKey ? `t::${themeKey}` : '']
    .filter(Boolean)
    .join('::');

  return extras ? `${line.productId}::${extras}` : line.productId;
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

    if (!findVariationOption(variation, selected)) {
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
