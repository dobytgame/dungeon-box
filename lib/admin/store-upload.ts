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
