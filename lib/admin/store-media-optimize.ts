import type { SupabaseClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import {
  STORE_MEDIA_BUCKET,
  STORE_MEDIA_CACHE_CONTROL,
  STORE_MEDIA_MAX_EDGE_PX,
  STORE_MEDIA_WEBP_QUALITY,
  getStoreMediaPublicUrl,
} from '@/lib/admin/store-upload';

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return ext;
  return 'jpg';
}

/**
 * Otimização com sharp — só importar em Route Handlers / scripts Node.
 * Nunca importar no middleware ou em módulos compartilhados com o edge.
 */
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

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_BYTES = 5 * 1024 * 1024;

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
