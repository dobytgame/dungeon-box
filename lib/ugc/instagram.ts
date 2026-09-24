const HANDLE_RE = /^[a-z0-9._]{1,30}$/i;

export function normalizeInstagramHandle(value: string | null | undefined): string | null {
  const raw = value?.trim() ?? '';
  if (!raw) return null;

  const handle = raw.replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  const cleaned = handle.split(/[/?#]/)[0]?.trim() ?? '';
  if (!cleaned) return null;
  if (!HANDLE_RE.test(cleaned)) return null;
  return cleaned.toLowerCase();
}

export function formatInstagramHandle(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return `@${handle}`;
}
