/**
 * layout-bands.ts — M4/M1: fixed vertical band grid + containment.
 *
 * Bands (Master Prompt §4.3, 1080x1920):
 *   disclaimer 0-140, badge 140-300, bubble 300-560, card 560-1100,
 *   captions 1100-1400, props/characters 1400-1920.
 * Elements MUST stay inside their band; build-time assertBox + runtime
 * bbox QC fail on any cross-band intersection.
 */
export const BANDS = {
  disclaimer: { y0: 0, y1: 140 },
  badge: { y0: 140, y1: 300 },
  bubble: { y0: 300, y1: 560 },
  card: { y0: 560, y1: 1100 },
  captions: { y0: 1100, y1: 1400 },
  props: { y0: 1400, y1: 1920 },
} as const;

export type BandName = keyof typeof BANDS;

export interface Box { x: number; y: number; w: number; h: number; }

export function assertInBand(band: BandName, box: Box, label: string): void {
  const b = BANDS[band];
  if (box.y < b.y0 || box.y + box.h > b.y1) {
    throw new Error(
      `[M4] ${label} escapes ${band} band: y=${box.y}..${box.y + box.h} vs ${b.y0}..${b.y1}`);
  }
  if (box.x < 0 || box.x + box.w > 1080) {
    throw new Error(`[M1] ${label} exceeds horizontal bounds: x=${box.x}..${box.x + box.w}`);
  }
}

/** Clamp helper: shrink/shift a box into its band (for measured text). */
export function fitToBand(band: BandName, box: Box): Box {
  const b = BANDS[band];
  const y = Math.max(b.y0, Math.min(box.y, b.y1 - box.h));
  return { ...box, y, h: Math.min(box.h, b.y1 - b.y0) };
}

/** Runtime per-frame check: does box intersect a FOREIGN band? */
export function bandViolations(band: BandName, box: Box): string[] {
  const b = BANDS[band];
  const v: string[] = [];
  (Object.keys(BANDS) as BandName[]).forEach((k) => {
    if (k === band) return;
    const o = BANDS[k];
    const overlapY = box.y < o.y1 && box.y + box.h > o.y0;
    const insideSelf = box.y >= b.y0 && box.y + box.h <= b.y1;
    if (overlapY && !insideSelf) v.push(k);
  });
  return v;
}
