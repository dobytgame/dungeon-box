import type { PaintKitBumpId } from './order-bumps';

const PAINT_KIT_PREFIX = 'paint_kit_bump:';

export function buildSpecialNotes(
  paintKitBump: PaintKitBumpId | null,
  userNotes: string
): string | null {
  const parts: string[] = [];
  if (paintKitBump) {
    parts.push(`${PAINT_KIT_PREFIX}${paintKitBump}`);
  }
  const trimmed = userNotes.trim();
  if (trimmed) parts.push(trimmed);
  return parts.length > 0 ? parts.join('\n') : null;
}

export function parsePaintKitBump(
  notes: string | null | undefined
): PaintKitBumpId | null {
  if (!notes) return null;
  const line = notes.split('\n').find((l) => l.startsWith(PAINT_KIT_PREFIX));
  if (!line) return null;
  const id = line.slice(PAINT_KIT_PREFIX.length);
  if (id === 'amador' || id === 'profissional') return id;
  return null;
}
