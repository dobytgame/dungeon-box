import type { SupabaseClient } from '@supabase/supabase-js';

export const STORE_MEDIA_BUCKET = 'store-media';

/** Lado máximo no upload — evita servir originais de vários MB na vitrine. */
export const STORE_MEDIA_MAX_EDGE_PX = 1600;
export const STORE_MEDIA_WEBP_QUALITY = 80;
export const STORE_MEDIA_CACHE_CONTROL = '31536000';

export function getStoreMediaPublicUrl(
  admin: SupabaseClient,
  path: string
): string {
  return admin.storage.from(STORE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Extrai o path do objeto a partir da URL pública do bucket store-media. */
export function parseStoreMediaObjectPath(
  url: string,
  supabaseUrl?: string
): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const marker = `/storage/v1/object/public/${STORE_MEDIA_BUCKET}/`;
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex >= 0) {
    return decodeURIComponent(trimmed.slice(markerIndex + marker.length).split('?')[0] ?? '');
  }

  if (supabaseUrl) {
    try {
      const base = new URL(supabaseUrl);
      const parsed = new URL(trimmed);
      if (parsed.hostname !== base.hostname) return null;
      const prefix = `/storage/v1/object/public/${STORE_MEDIA_BUCKET}/`;
      if (!parsed.pathname.startsWith(prefix)) return null;
      return decodeURIComponent(parsed.pathname.slice(prefix.length));
    } catch {
      return null;
    }
  }

  return null;
}

export function parseGalleryUrls(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }
  } catch {
    // fallback: one URL per line
  }
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export type StoreMediaFile = {
  path: string;
  url: string;
  name: string;
  folder: string;
  updatedAt: string | null;
};

const MEDIA_LIST_MAX_FILES = 240;

export async function listStoreMediaFiles(
  admin: SupabaseClient,
  options?: { maxFiles?: number }
): Promise<StoreMediaFile[]> {
  const maxFiles = options?.maxFiles ?? MEDIA_LIST_MAX_FILES;
  const files: StoreMediaFile[] = [];

  async function walk(prefix: string): Promise<void> {
    if (files.length >= maxFiles) return;

    const { data, error } = await admin.storage.from(STORE_MEDIA_BUCKET).list(prefix, {
      limit: 100,
      sortBy: { column: 'updated_at', order: 'desc' },
    });

    if (error) {
      console.error('[store] listStoreMediaFiles:', prefix, error.message);
      return;
    }

    for (const entry of data ?? []) {
      if (files.length >= maxFiles) break;

      const entryPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const isFolder = !entry.id;

      if (isFolder) {
        await walk(entryPath);
        continue;
      }

      const { data: publicData } = admin.storage
        .from(STORE_MEDIA_BUCKET)
        .getPublicUrl(entryPath);

      files.push({
        path: entryPath,
        url: publicData.publicUrl,
        name: entry.name,
        folder: prefix || '/',
        updatedAt: entry.updated_at ?? entry.created_at ?? null,
      });
    }
  }

  await walk('');
  return files;
}
