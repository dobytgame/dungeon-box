import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';

export const STORE_MEDIA_BUCKET = 'store-media';

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024;
/** Lado máximo no upload — evita servir originais de vários MB na vitrine. */
export const STORE_MEDIA_MAX_EDGE_PX = 1600;
export const STORE_MEDIA_WEBP_QUALITY = 80;
export const STORE_MEDIA_CACHE_CONTROL = '31536000';

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  return 'jpg';
}

export async function optimizeStoreMediaBytes(
  bytes: Buffer,
  mimeType: string
): Promise<{ bytes: Buffer; mimeType: string; ext: string }> {
  if (mimeType === 'image/gif') {
    return { bytes, mimeType, ext: 'gif' };
  }

  try {
    const image = sharp(bytes, { failOn: 'none' }).rotate();
    const meta = await image.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    let pipeline = image;

    if (width > STORE_MEDIA_MAX_EDGE_PX || height > STORE_MEDIA_MAX_EDGE_PX) {
      pipeline = pipeline.resize({
        width: STORE_MEDIA_MAX_EDGE_PX,
        height: STORE_MEDIA_MAX_EDGE_PX,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const optimized = await pipeline
      .webp({ quality: STORE_MEDIA_WEBP_QUALITY })
      .toBuffer();
    return { bytes: optimized, mimeType: 'image/webp', ext: 'webp' };
  } catch (error) {
    console.error(
      '[store] optimizeStoreMediaBytes fallback:',
      error instanceof Error ? error.message : error
    );
    return {
      bytes,
      mimeType,
      ext: sanitizeExtension(`file.${mimeType.split('/')[1] ?? 'jpg'}`),
    };
  }
}

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

  const optimized = await optimizeStoreMediaBytes(input.bytes, input.mimeType);
  const folder = input.folder?.trim() || 'products';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${optimized.ext}`;

  const { error } = await admin.storage
    .from(STORE_MEDIA_BUCKET)
    .upload(path, optimized.bytes, {
      contentType: optimized.mimeType,
      cacheControl: STORE_MEDIA_CACHE_CONTROL,
      upsert: false,
    });

  if (error) {
    console.error('[store] uploadStoreMediaFile:', error.message);
    return { error: 'Falha ao enviar imagem. Verifique o bucket store-media no Supabase.' };
  }

  return { url: getStoreMediaPublicUrl(admin, path) };
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
