const DEFAULT_MAX_SLUG_LENGTH = 80;
const DEFAULT_FALLBACK = 'produto';

const PT_STOP_WORDS = new Set([
  'a',
  'o',
  'as',
  'os',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'na',
  'no',
  'nas',
  'nos',
  'para',
  'por',
  'com',
  'um',
  'uma',
  'uns',
  'umas',
]);

export type GenerateSeoSlugOptions = {
  /** Limite de caracteres do slug (corta na última palavra completa). */
  maxLength?: number;
  /** Valor usado quando o título não gera slug válido. */
  fallback?: string;
  /** Remove artigos e preposições comuns em português. */
  removeStopWords?: boolean;
};

function stripDiacritics(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe');
}

function prepareTitleForSlug(title: string): string {
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/\+/g, ' mais ')
    .replace(/@/g, ' at ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsToSlug(words: string[]): string {
  return words
    .map((word) => word.replace(/[^a-z0-9]+/g, ''))
    .filter(Boolean)
    .join('-');
}

function truncateSlugAtWord(slug: string, maxLength: number): string {
  if (slug.length <= maxLength) return slug;

  const truncated = slug.slice(0, maxLength);
  const lastHyphen = truncated.lastIndexOf('-');
  if (lastHyphen > 0) return truncated.slice(0, lastHyphen);

  return truncated.replace(/-+$/g, '');
}

function finalizeSlug(raw: string, options?: GenerateSeoSlugOptions): string {
  const maxLength = options?.maxLength ?? DEFAULT_MAX_SLUG_LENGTH;
  const fallback = options?.fallback ?? DEFAULT_FALLBACK;

  const slug = truncateSlugAtWord(
    raw.replace(/-+/g, '-').replace(/^-+|-+$/g, ''),
    maxLength
  );

  return slug || fallback;
}

/**
 * Gera um slug amigável para SEO a partir de um título em português.
 * Ex.: "Kit de Pintura para Miniaturas 28mm" → "kit-de-pintura-para-miniaturas-28mm"
 */
export function generateSeoSlug(
  title: string,
  options?: GenerateSeoSlugOptions
): string {
  const prepared = prepareTitleForSlug(title);
  if (!prepared) {
    return options?.fallback ?? DEFAULT_FALLBACK;
  }

  let words = prepared.split(' ');

  if (options?.removeStopWords && words.length > 2) {
    const filtered = words.filter((word) => !PT_STOP_WORDS.has(word));
    if (filtered.length > 0) words = filtered;
  }

  return finalizeSlug(wordsToSlug(words), options);
}

/**
 * Normaliza um slug digitado manualmente para o mesmo padrão SEO.
 */
export function normalizeSeoSlug(
  raw: string,
  options?: Pick<GenerateSeoSlugOptions, 'maxLength' | 'fallback'>
): string {
  const prepared = prepareTitleForSlug(raw.replace(/-/g, ' '));
  if (!prepared) {
    return options?.fallback ?? DEFAULT_FALLBACK;
  }

  return finalizeSlug(wordsToSlug(prepared.split(' ')), options);
}

export function isValidSeoSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Garante slug único acrescentando sufixo numérico (-2, -3, ...).
 */
export function ensureUniqueSeoSlug(
  slug: string,
  existingSlugs: Iterable<string>
): string {
  const taken = new Set(
    Array.from(existingSlugs, (value) => value.trim().toLowerCase()).filter(
      Boolean
    )
  );

  if (!taken.has(slug)) return slug;

  let suffix = 2;
  while (taken.has(`${slug}-${suffix}`)) {
    suffix += 1;
  }

  return `${slug}-${suffix}`;
}
