import type { SupabaseClient } from '@supabase/supabase-js';
import {
  UGC_BUCKET,
  isUgcAllowedMime,
  isUgcVideoMime,
  ugcMaxBytesForMime,
} from '@/lib/ugc/constants';

function sanitizeExtension(fileName: string, mimeType: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov'].includes(ext)) return ext;
  if (mimeType === 'video/quicktime') return 'mov';
  if (mimeType === 'video/mp4') return 'mp4';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

export function buildUgcStoragePath(userId: string, fileName: string, mimeType: string): string {
  const ext = sanitizeExtension(fileName, mimeType);
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

export function validateUgcUpload(input: {
  mimeType: string;
  byteSize: number;
}): { error: string } | null {
  if (!isUgcAllowedMime(input.mimeType)) {
    return { error: 'Formato não suportado. Use JPG, PNG, WebP, MP4 ou MOV.' };
  }

  const max = ugcMaxBytesForMime(input.mimeType);
  if (input.byteSize > max) {
    const mb = Math.round(max / (1024 * 1024));
    return {
      error: isUgcVideoMime(input.mimeType)
        ? `Vídeo muito grande. Máximo ${mb} MB.`
        : `Imagem muito grande. Máximo ${mb} MB.`,
    };
  }

  return null;
}

export async function createUgcSignedUpload(
  admin: SupabaseClient,
  input: { userId: string; fileName: string; mimeType: string; byteSize: number }
): Promise<
  | { path: string; token: string; signedUrl: string; mimeType: string; byteSize: number }
  | { error: string }
> {
  const invalid = validateUgcUpload(input);
  if (invalid) return invalid;

  const path = buildUgcStoragePath(input.userId, input.fileName, input.mimeType);
  const { data, error } = await admin.storage.from(UGC_BUCKET).createSignedUploadUrl(path);

  if (error || !data?.token || !data.signedUrl) {
    console.error('[ugc] createUgcSignedUpload:', error?.message);
    return { error: 'Falha ao preparar o envio. Tente novamente.' };
  }

  return {
    path: data.path ?? path,
    token: data.token,
    signedUrl: data.signedUrl,
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  };
}

export async function uploadUgcImage(
  admin: SupabaseClient,
  input: {
    userId: string;
    fileName: string;
    mimeType: string;
    bytes: Buffer;
  }
): Promise<{ path: string; mimeType: string; byteSize: number } | { error: string }> {
  const invalid = validateUgcUpload({
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
  });
  if (invalid) return invalid;

  const path = buildUgcStoragePath(input.userId, input.fileName, input.mimeType);
  const { error } = await admin.storage.from(UGC_BUCKET).upload(path, input.bytes, {
    contentType: input.mimeType,
    upsert: false,
  });

  if (error) {
    console.error('[ugc] uploadUgcImage:', error.message);
    return { error: 'Falha ao enviar arquivo. Tente novamente.' };
  }

  return {
    path,
    mimeType: input.mimeType,
    byteSize: input.bytes.byteLength,
  };
}
