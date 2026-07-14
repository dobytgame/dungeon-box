import type { SupabaseClient } from '@supabase/supabase-js';

export const STORE_MEDIA_BUCKET = 'store-media';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024;

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  return 'jpg';
}

export async function uploadStoreMediaFile(
  admin: SupabaseClient,
  input: {
    fileName: string;
    mimeType: string;
    bytes: Buffer;
    folder?: string;
  }
): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return { error: 'Formato não suportado. Use JPG, PNG, WebP ou GIF.' };
  }

  if (input.bytes.byteLength > MAX_BYTES) {
    return { error: 'Arquivo muito grande. Máximo 5 MB.' };
  }

  const folder = input.folder?.trim() || 'products';
  const ext = sanitizeExtension(input.fileName);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await admin.storage
    .from(STORE_MEDIA_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    console.error('[store] uploadStoreMediaFile:', error.message);
    return { error: 'Falha ao enviar imagem. Verifique o bucket store-media no Supabase.' };
  }

  const { data } = admin.storage.from(STORE_MEDIA_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
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
