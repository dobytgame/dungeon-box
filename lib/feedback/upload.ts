import type { SupabaseClient } from '@supabase/supabase-js';

export const USER_FEEDBACK_BUCKET = 'user-feedback';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAX_BYTES = 5 * 1024 * 1024;

function sanitizeExtension(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return ext;
  return 'jpg';
}

export async function uploadUserFeedbackImage(
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

  if (input.bytes.byteLength > MAX_BYTES) {
    return { error: 'Arquivo muito grande. Máximo 5 MB.' };
  }

  const ext = sanitizeExtension(input.fileName);
  const path = `${input.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await admin.storage
    .from(USER_FEEDBACK_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (error) {
    console.error('[feedback] uploadUserFeedbackImage:', error.message);
    return { error: 'Falha ao enviar imagem. Tente novamente.' };
  }

  return { path };
}
