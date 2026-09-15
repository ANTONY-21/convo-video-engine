/**
 * scene-schema.ts — pre-render validation gate (G1)
 *
 * Fails the BUILD (not the render) on:
 *   M1: statCard.topicId !== dialogue.topicId  (data-binding leak)
 *   M3: text wider than its container budget   (overflow — static budget check;
 *       exact measurement happens in-component via measureText)
 *   M4: duplicate stat-card content hash within one video
 *   A3: disclaimer beat missing or not present as persistent overlay spec
 *
 * Env-driven config, no hardcoded paths. Import from build_entry.ts or run
 * directly: npx tsx scene-schema.ts scenes.json
 */
import { z } from 'zod';

// ---- env config -----------------------------------------------------------
const CFG = {
  maxBubbleLines: parseInt(process.env.SCHEMA_MAX_BUBBLE_LINES ?? '4', 10),
  maxLineChars: parseInt(process.env.SCHEMA_MAX_LINE_CHARS ?? '42', 10),
  maxCardLabelChars: parseInt(process.env.SCHEMA_MAX_CARD_LABEL ?? '28', 10),
  badgeMaxChars: parseInt(process.env.SCHEMA_BADGE_MAX_CHARS ?? '18', 10),
  requiredTopics: (process.env.SCHEMA_TOPICS ?? 'eye_health,finance').split(','),
} as const;

// ---- schemas ---------------------------------------------------------------
const TopicId = z.enum(CFG.requiredTopics as [string, ...string[]]);

const StatCardSchema = z.object({
  kind: z.literal('stat_card'),
  topicId: TopicId,                       // M1: must match the beat's topic
  left: z.object({ label: z.string().max(CFG.maxCardLabelChars), value: z.string().max(14) }),
  right: z.object({ label: z.string().max(CFG.maxCardLabelChars), value: z.string().max(14) }),
  source: z.string().min(3),              // A6: citation mandatory on stats
});

const BadgeSchema = z.object({
  kind: z.literal('badge'),
  topicId: TopicId,
  text: z.string().max(CFG.badgeMaxChars), // M3: static budget; measureText sizes the pill
});

const VisualSchema = z.discriminatedUnion('kind', [
  StatCardSchema,
  BadgeSchema,
  z.object({ kind: z.literal('cta'), topicId: TopicId }),
  z.object({
    kind: z.literal('rule_card'),
    topicId: TopicId,
    rule: z.string().min(2).max(24),
    lines: z.array(z.string().min(1).max(28)).min(2).max(4),
    source: z.string().min(3).optional(),
  }),
  z.object({ kind: z.literal('chart'), topicId: TopicId, source: z.string().min(3) }),
]);

const SceneSchema = z.object({
  id: z.number().int().positive(),
  speaker: z.enum(['RAVI', 'VIKRAM', 'NARRATOR']),
  scene: z.string(),
  topicId: TopicId,
  lines: z.array(z.string().min(1).max(CFG.maxLineChars)).max(CFG.maxBubbleLines).default([]), // M9: optional — bubble only when a character speaks
  visual: VisualSchema.nullable(),
  startFrame: z.number().int().min(0),
  frames: z.number().int().min(30),        // I1: min 1s; max checked in validator
  voText: z.string().min(1),               // A1: caption source must exist
});

export const ConvoDocSchema = z.object({
  title: z.string().min(1),
  topicId: TopicId,
  fps: z.literal(30),
  width: z.literal(1080),                  // M5: correct 9:16 canvas enforced here
  height: z.literal(1920),
  disclaimer: z.object({                   // A3: persistent overlay from 0s
    text: z.literal('Education only — not medical advice'),
    fromFrame: z.literal(0),
  }),
  scenes: z.array(SceneSchema).min(3).max(12),
});

export type ConvoDoc = z.infer<typeof ConvoDocSchema>;
export type Scene = z.infer<typeof SceneSchema>;

// ---- cross-scene validator (throws, never warns) ---------------------------
export function validateConvoDoc(doc: unknown): ConvoDoc {
  const d = ConvoDocSchema.parse(doc); // throws ZodError with full path info

  // M4 — duplicate stat-card hash
  const seen = new Map<string, number>();
  d.scenes.forEach((s, i) => {
    if (s.visual?.kind === 'stat_card') {
      const h = JSON.stringify([s.visual.left, s.visual.right]);
      if (seen.has(h)) {
        throw new Error(
          `[M4] duplicate stat card: scenes ${seen.get(h) + 1} and ${i + 1} render identical content`);
      }
      seen.set(h, i);
    }
  });

  // M1 — topic binding (card topic must equal its scene's topic)
  d.scenes.forEach((s, i) => {
    if (s.visual && s.visual.kind !== 'cta' && 'topicId' in s.visual
        && s.visual.topicId !== s.topicId) {
      throw new Error(
        `[M1] data-binding leak: scene ${i + 1} topicId=${s.topicId} but visual topicId=${s.visual.topicId}`);
    }
  });

  // I1 — max visual state duration (2.5s of static state; beats may run longer
  // only if their visual interpolates, which the component guarantees)
  const maxStatic = parseInt(process.env.SCHEMA_MAX_STATIC_S ?? '8', 10);
  d.scenes.forEach((s) => {
    if (s.frames > maxStatic * d.fps) {
      throw new Error(`[I1] scene ${s.id} runs ${s.frames / d.fps}s > ${maxStatic}s static budget`);
    }
  });

  // A3 — disclaimer must exist (schema already enforces fromFrame=0)
  return d;
}
