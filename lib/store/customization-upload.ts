import type { SupabaseClient } from '@supabase/supabase-js';

export const STORE_CUSTOMIZATION_BUCKET = 'store-customizations';

export const STORE_CUSTOMIZATION_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext;
  return 'jpg';
}

export async function uploadStoreCustomizationImage(
  admin: SupabaseClient,
  input: {
    userId: string;
    fileName: string;
    mimeType: string;
    bytes: Buffer;
  }
): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_MIME.has(input.mimeType)) {
    return { error: 'Formato não suportado. Use JPG, PNG ou WebP.' };
  }

  if (input.bytes.byteLength > STORE_CUSTOMIZATION_MAX_BYTES) {
    return { error: 'Arquivo muito grande. Máximo 10 MB por imagem.' };
  }

  const ext = sanitizeExtension(input.fileName);
  const path = `${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await admin.storage
    .from(STORE_CUSTOMIZATION_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    console.error('[store] uploadStoreCustomizationImage:', error.message);
    return { error: 'Falha ao enviar imagem. Tente novamente.' };
  }

  return { path };
}

export async function signStoreCustomizationUrls(
  admin: SupabaseClient,
  paths: string[],
  ttlSeconds = 3600
): Promise<string[]> {
  const urls: string[] = [];

  for (const path of paths) {
    if (!path.trim()) continue;
    const { data, error } = await admin.storage
      .from(STORE_CUSTOMIZATION_BUCKET)
      .createSignedUrl(path, ttlSeconds);

    if (error) {
      console.error('[store] signStoreCustomizationUrls:', error.message);
      continue;
    }

    if (data?.signedUrl) {
      urls.push(data.signedUrl);
    }
  }

  return urls;
}
