/**
 * validateScene.ts — G3: FULL pre-render gate (extends scene-schema.ts)
 *
 * Master Prompt §3-5 rules enforced here, build FAILS on any violation:
 *   M3/G3: last scene kind == 'cta' (CTA end card regression guard)
 *   M5:    bubble text must NOT duplicate card title verbatim
 *   M5:    <= 3 text elements per frame (bubble OR card OR badge — caption excluded)
 *   5.1:   hook keyword present in scene 0 voText (approved formulas)
 *   5.1:   payoff stated (one-sentence fix) by <= 60% of scenes
 *   4.4:   every statistic carries a source micro-text
 *   4.4:   niche disclaimer matched to niche (health/finance/affiliate)
 *   V6:    doc carries required monetization path
 *
 * Env-driven, no hardcoded paths. Run: npx tsx validateScene.ts <scenes.json>
 */
import { z } from 'zod';
import { ConvoDocSchema } from './scene-schema';

const CFG = {
  maxTextElements: parseInt(process.env.VAL_MAX_TEXT_ELEMS ?? '3', 10),
  payoffByFraction: parseFloat(process.env.VAL_PAYOFF_FRACTION ?? '0.6'),
  hookKeywords: (process.env.VAL_HOOK_KEYWORDS ??
    'stop,damaging,wrong,doctors,secret,everyone,if you,never,why,how,7 in 10,still,right now'
  ).split(','),
  nicheDisclaimers: {
    health: 'Education only — not medical advice',
    finance: 'Education only — not financial advice',
    affiliate: 'Paid partnership disclosure in description',
  },
} as const;

const NicheSchema = z.enum(['health', 'finance', 'affiliate', 'ai_tools', 'legal', 'story']);

const MonetizationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('affiliate'), product: z.string().min(2), linkEnv: z.string().min(3) }),
  z.object({ type: z.literal('lead_magnet'), commentWord: z.string().min(2), dmFlow: z.string().min(2) }),
  z.object({ type: z.literal('funnel'), longFormId: z.string().min(2) }),
  z.object({ type: z.literal('service'), bioLink: z.string().min(2) }),
]);

const ExtendedDocSchema = ConvoDocSchema.extend({
  niche: NicheSchema,
  monetization: MonetizationSchema,
});

type Doc = z.infer<typeof ExtendedDocSchema>;
type Scene = Doc['scenes'][number];

function fail(rule: string, msg: string): never {
  throw new Error(`[${rule}] ${msg}`);
}

/** Count distinct text layers on a frame: bubble lines, card title/body, badge. */
function textElementCount(s: Scene): number {
  let n = 0;
  if (s.lines?.length) n += 1;               // bubble = one element
  if (s.visual?.kind === 'stat_card') n += 1; // card = one element
  if (s.visual?.kind === 'badge') n += 1;     // badge = one element
  return n;
}

export function validateSceneDoc(raw: unknown): Doc {
  const d = ExtendedDocSchema.parse(raw);
  const scenes = d.scenes as Scene[];

  // M3/G3 — final scene MUST be the CTA end card
  const last = scenes[scenes.length - 1];
  if (last.visual?.kind !== 'cta') {
    fail('M3', `last scene (${last.id}) visual.kind='${last.visual?.kind}' — must be 'cta'`);
  }
  const ctaFrames = last.frames / d.fps;
  if (ctaFrames < 1.5 || ctaFrames > 2.5) {
    fail('M3', `CTA end card runs ${ctaFrames.toFixed(2)}s — spec 1.5-2.0s`);
  }

  // M5 — bubble must not duplicate card title verbatim
  scenes.forEach((s) => {
    if (s.visual?.kind === 'stat_card' && s.lines?.length) {
      const bubbleText = s.lines.join(' ').toLowerCase();
      if (bubbleText.includes(s.visual.left.label.toLowerCase()) ||
          bubbleText.includes(s.visual.right.label.toLowerCase())) {
        fail('M5', `scene ${s.id}: bubble repeats card label — remove one layer`);
      }
    }
    // M5 — max text elements
    const n = textElementCount(s);
    if (n > CFG.maxTextElements) {
      fail('M5', `scene ${s.id}: ${n} text elements > max ${CFG.maxTextElements}`);
    }
  });

  // M9 — NARRATOR scenes carry no bubble; characters carry the bubble
  scenes.forEach((s) => {
    if (s.speaker === 'NARRATOR' && s.lines?.length) {
      fail('M9', `scene ${s.id}: NARRATOR has a bubble — bubbles are for characters (RAVI/VIKRAM) only`);
    }
  });

  // 5.1 — hook keyword in scene 0
  const hook = scenes[0].voText.toLowerCase();
  if (!CFG.hookKeywords.some((k) => hook.includes(k))) {
    fail('5.1', `scene 0 voText has no approved hook keyword (formulas: ${CFG.hookKeywords.slice(0, 5).join(' / ')}...)`);
  }

  // 5.1 — payoff (short form of the fix) by 60% of scenes
  const payoffScene = scenes.findIndex((s) => s.visual?.kind === 'rule_card' || /every \d+ (minutes|seconds)|rule|fix|do this/i.test(s.voText));
  if (payoffScene === -1) {
    fail('5.1', 'no payoff scene detected (rule/fix/tool)');
  } else if (payoffScene / scenes.length > CFG.payoffByFraction) {
    fail('5.1', `payoff at scene ${payoffScene + 1}/${scenes.length} — must land by ${Math.round(CFG.payoffByFraction * 100)}%`);
  }

  // 4.4 — stat source already enforced by StatCardSchema.source (zod min 3).

  // 4.4 — disclaimer matches niche
  const expected = (CFG.nicheDisclaimers as Record<string, string>)[d.niche];
  if (expected && d.disclaimer.text !== expected) {
    fail('4.4', `disclaimer '${d.disclaimer.text}' does not match niche '${d.niche}' (expected '${expected}')`);
  }

  // V6 — monetization present (schema-enforced; reach here = valid)
  return d;
}

// ---- CLI --------------------------------------------------------------------
if (process.argv[1]?.endsWith('validateScene.ts')) {
  const path = process.argv[2];
  if (!path) { console.error('usage: npx tsx validateScene.ts <scenes.json>'); process.exit(2); }
  try {
    const doc = JSON.parse(require('fs').readFileSync(path, 'utf8'));
    validateSceneDoc(doc);
    console.log(JSON.stringify({ ok: true, scenes: doc.scenes.length, niche: doc.niche }));
  } catch (e: unknown) {
    console.error(JSON.stringify({ ok: false, error: (e as Error).message }));
    process.exit(1);
  }
}
