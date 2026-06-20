import type { PaintKitBumpId } from './order-bumps';

const PAINT_KIT_PREFIX = 'paint_kit_bump:';

export function buildSpecialNotes(
  paintKitBump: PaintKitBumpId | null,
  userNotes: string,
  paintKitBumpRecurring = false
): string | null {
  const parts: string[] = [];
  if (paintKitBump) {
    const suffix = paintKitBumpRecurring ? ':recurring' : '';
    parts.push(`${PAINT_KIT_PREFIX}${paintKitBump}${suffix}`);
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
  const raw = line.slice(PAINT_KIT_PREFIX.length);
  const id = raw.replace(/:recurring$/, '');
  if (id === 'amador' || id === 'profissional') return id;
  return null;
}

export function parsePaintKitBumpRecurring(
  notes: string | null | undefined
): boolean {
  if (!notes) return false;
  const line = notes.split('\n').find((l) => l.startsWith(PAINT_KIT_PREFIX));
  return line?.endsWith(':recurring') ?? false;
}

export function hasPaintKitBump(notes: string | null | undefined): boolean {
  return parsePaintKitBump(notes) !== null;
}

export function setPaintKitBumpInNotes(
  notes: string | null | undefined,
  bumpId: PaintKitBumpId,
  recurring: boolean
): string {
  const customerNotes = (notes ?? '')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith(PAINT_KIT_PREFIX));
  const bumpLine = `${PAINT_KIT_PREFIX}${bumpId}${recurring ? ':recurring' : ''}`;
  return [...customerNotes, bumpLine].join('\n');
}
