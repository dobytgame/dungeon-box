export const UGC_BUCKET = 'ugc-submissions';

export const UGC_MAX_FILES = 10;
export const UGC_MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const UGC_MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const UGC_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const UGC_VIDEO_MIME = ['video/mp4', 'video/quicktime'] as const;
export const UGC_ALLOWED_MIME = [...UGC_IMAGE_MIME, ...UGC_VIDEO_MIME] as const;

export const UGC_REWARD_BONUS_NOTE = 'UGC: brinde Mostre sua Aventura';

export const UGC_REWARD_ELIGIBLE_STATUSES = [
  'upcoming',
  'production',
  'preparing',
] as const;

export const UGC_REWARD_SENT_STATUSES = [
  'packed',
  'awaiting_pickup',
  'shipped',
  'delivered',
] as const;

export const UGC_REJECT_REASONS = [
  { value: 'quality', label: 'Qualidade insuficiente' },
  { value: 'unrelated', label: 'Não relacionado à DungeonBox' },
  { value: 'inappropriate', label: 'Conteúdo inadequado' },
  { value: 'missing_consent', label: 'Sem autorização necessária' },
  { value: 'third_party_rights', label: 'Problema com direitos de terceiros' },
  { value: 'corrupt', label: 'Arquivo corrompido' },
  { value: 'duplicate', label: 'Material duplicado' },
  { value: 'other', label: 'Outro' },
] as const;

export type UgcRejectReason = (typeof UGC_REJECT_REASONS)[number]['value'];

export function isUgcVideoMime(mime: string): boolean {
  return (UGC_VIDEO_MIME as readonly string[]).includes(mime);
}

export function isUgcAllowedMime(mime: string): boolean {
  return (UGC_ALLOWED_MIME as readonly string[]).includes(mime);
}

export function ugcMaxBytesForMime(mime: string): number {
  return isUgcVideoMime(mime) ? UGC_MAX_VIDEO_BYTES : UGC_MAX_IMAGE_BYTES;
}
