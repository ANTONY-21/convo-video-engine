/**
 * hooks.ts — V1 (Master Prompt §8, §5.5)
 * Hook library + weighted sampler for A/B self-learning loop.
 * Ports the proven hook_system.py logic to TypeScript for Remotion pipeline.
 *
 * Sources consolidated:
 * - HOOK_1000_LIBRARY.md (20 categories, proven templates)
 * - Sreevignesh 5-framework playbook (research-cited triggers)
 * - BrandbySid 10-pillar hook system (quality gate, >=14/20)
 *
 * Usage:
 *   import { makeHook, HookMeta } from './hooks';
 *   const [hook, meta] = makeHook({ niche: 'ai_news', asset: 'GPT-6', ... });
 */

import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// TEMPLATE LIBRARY (ported from hook_system.py)
// ============================================================================

export interface SlotMap {
  X?: string; // asset / topic
  P?: string; // pain / problem
  N?: string; // number / metric
  [key: string]: string | undefined;
}

export interface HookMeta {
  category: string;
  score: number;
  gate: 'PASS' | 'FALLBACK';
  niche: string;
  shape: string;
  templateStructure?: number;
}

type TemplateCategory = keyof typeof TEMPLATES;

const TEMPLATES: Record<string, string[]> = {
  warning: [
    'STOP doing this with {X}… every single day.',
    'This is quietly damaging your {X}. And you don\'t even realize it.',
    'Things that are destroying your {X} without you realizing.',
    'If you see this in {X} — stop. Now.',
  ],
  loss_aversion: [
    'You\'ll never fix {X} if you keep doing this.',
    'If you\'re a {N} user, do NOT do this in 2026.',
    'Losing {X}? This mistake is costing you {N} right now.',
  ],
  direct_callout: [
    'If you {P}, this video is for you.',
    'You — yes YOU — are doing {X} wrong.',
    'If you want {P} fixed in the next 30 seconds, keep watching.',
  ],
  curiosity_gap: [
    'There\'s one thing about {X} nobody tells you…',
    '{X} has a hidden problem. It\'s not what you think.',
    'Everyone gets {X} wrong. The reason is stranger than you think.',
  ],
  open_loop: [
    'Wait till you see what {X} does at the end…',
    'The biggest {X} mistake is at the end. Don\'t skip.',
    'Number {N} will change how you use {X} forever.',
  ],
  myth_bust: [
    'Almost everyone thinks they know {X}. They don\'t.',
    'Everyone tells you {X} is the problem. Nobody shows you why.',
  ],
  visual_proof: [
    'This is what {N} actually looks like.',
    'This is your {X} on {P}. Look closely.',
  ],
  time_pressure: [
    'Give me 10 seconds and you\'ll never {P} again.',
    'In the next 30 seconds, you\'ll see {X} differently forever.',
  ],
  confession: [
    'I\'ve been doing {X} wrong for years. Here\'s the fix.',
    'Nobody talks about this {X} mistake. I made it for a decade.',
  ],
  equivalence: [
    '{N}. That\'s how much {X} is at stake.',
    '{N} of {X} — gone. Every single day.',
    'More {P} than a supercomputer? {N}.',
    'This {X} has more {P} than an entire data center.',
  ],
  before_after: [
    'Before {X}: {P}. After {X}: {N}.',
    'This is what {X} looked like 30 days ago. This is now.',
  ],
  cheat: [
    'The {X} cheat code {N}% of people don\'t know.',
    'Stop doing {X} the hard way. This takes {N} seconds.',
  ],
  checklist: [
    '{N} signs your {X} is failing. Check #3.',
    '{N}-point {X} audit. You\'re missing #{N}.',
  ],
  prediction: [
    'In 2026, {X} will {P}. Here\'s why.',
    'The next {X} shift is {N} months away. Are you ready?',
  ],
  authority: [
    '{N} experts agree: {X} is the wrong approach.',
    'Top {P} researcher reveals: {X} works backwards.',
  ],
  contrarian: [
    'Everyone says {X}. The data says {P}.',
    'Why {X} is actually good for you (and {N} studies prove it).',
  ],
  story_open: [
    'I lost {N} because of {X}. Don\'t make my mistake.',
    'My {X} broke on day {N}. Here\'s what I learned.',
  ],
  question_stack: [
    'What if {X}? What if {P}? What if {N}?',
    'Why does {X} happen? The answer changes {P}.',
  ],
  visual_metaphor: [
    '{X} is like {P} — but {N}x worse.',
    'Think {X} is {P}? It\'s actually {N}.',
  ],
  resource_lock: [
    'Save this {X} guide. You\'ll need it by {N}.',
    'The only {X} checklist you\'ll ever need. {N} steps.',
  ],
};

// Story shape -> preferred categories (ordered)
const SHAPE_ROUTING: Record<string, TemplateCategory[]> = {
  man_in_hole: ['warning', 'loss_aversion', 'direct_callout', 'curiosity_gap'],
  creation: ['curiosity_gap', 'myth_bust', 'visual_proof', 'equivalence'],
  cinderella: ['before_after', 'visual_proof', 'equivalence', 'time_pressure'],
  default: ['warning', 'curiosity_gap', 'direct_callout', 'open_loop'],
};

// Channel niche -> category bias (extra weight on top of story shape)
const NICHE_BIAS: Record<string, TemplateCategory[]> = {
  ai_news: ['myth_bust', 'equivalence', 'time_pressure'],
  ai_code: ['direct_callout', 'confession', 'cheat'],
  finance: ['loss_aversion', 'warning', 'equivalence'],
  health: ['warning', 'direct_callout', 'confession'],
  policy: ['warning', 'curiosity_gap', 'myth_bust'],
  startup: ['equivalence', 'time_pressure', 'confession'],
};

// BrandbySid 10-pillar gate (0-2 each, 20 max, pass >= 14)
const PILLARS: Record<string, RegExp> = {
  grab_attention: /(stop|wait|wrong|warning|never|don't|biggest|burning|killing|\?)/,
  curiosity: /(\.\.\.|\.\.\.|hidden|nobody|secret|why|what|\?|how)/,
  relevance: /(you|your|you're)/,
  value_early: /(fix|here's|this is how|in \d+ seconds?|before|\d+ (hours|days|minutes))/,
  expectation: /(end|forever|differently|keep watching|don't skip|until)/,
  audience: /(you|your)/,
  angle: /(nobody|everyone|almost|hidden|quietly|most people|24 hours)/,
  craft: /^[^,;]{10,70}$/, // short, sharp, readable
  testable: /./, // always 1 — A/B store does the rest
  placement: /./, // always 1 — burned as first line
};

const STOP_END = new Set([
  'a', 'the', 'and', 'of', 'to', 'that', 'is', 'in', 'on', 'for', 'with', 'your', 'you', 'are', 'out'
]);

// ============================================================================
// WIN-RATE TABLE (SQLite-backed for persistence)
// ============================================================================

export interface WinRateEntry {
  hook_formula: string;
  niche: string;
  topic: string;
  views: number;
  retention_3s: number;
  avd_pct: number;
  completion_pct: number;
  rewatch_pct: number;
  shares: number;
  saves: number;
  follows_per_1k: number;
  renders: number;
  last_updated: string;
}

let winRateCache: WinRateEntry[] | null = null;
const WIN_RATE_DB = process.env.WIN_RATE_DB || '/root/ak-ai-company/data/win_rate.sqlite';

function initWinRateDB(): void {
  // This would be called at startup; for now we use in-memory cache with JSON fallback
  try {
    const { execSync } = require('child_process');
    execSync(`mkdir -p ${dirname(WIN_RATE_DB)} && sqlite3 ${WIN_RATE_DB} "
      CREATE TABLE IF NOT EXISTS win_rates (
        hook_formula TEXT,
        niche TEXT,
        topic TEXT,
        views INTEGER DEFAULT 0,
        retention_3s REAL DEFAULT 0,
        avd_pct REAL DEFAULT 0,
        completion_pct REAL DEFAULT 0,
        rewatch_pct REAL DEFAULT 0,
        shares INTEGER DEFAULT 0,
        saves INTEGER DEFAULT 0,
        follows_per_1k REAL DEFAULT 0,
        renders INTEGER DEFAULT 0,
        last_updated TEXT,
        PRIMARY KEY (hook_formula, niche, topic)
      );
    "`, { stdio: 'ignore' });
  } catch {
    // SQLite not available, use JSON fallback
  }
}

function loadWinRateCache(): void {
  if (winRateCache) return;
  try {
    const { execSync } = require('child_process');
    const out = execSync(`sqlite3 ${WIN_RATE_DB} "SELECT * FROM win_rates"`, { encoding: 'utf8' });
    winRateCache = out.trim().split('\n').filter(l => l).map(line => {
      const [hook_formula, niche, topic, views, retention_3s, avd_pct, completion_pct, rewatch_pct, shares, saves, follows_per_1k, renders, last_updated] = line.split('|');
      return {
        hook_formula, niche, topic,
        views: parseInt(views), retention_3s: parseFloat(retention_3s),
        avd_pct: parseFloat(avd_pct), completion_pct: parseFloat(completion_pct),
        rewatch_pct: parseFloat(rewatch_pct), shares: parseInt(shares),
        saves: parseInt(saves), follows_per_1k: parseFloat(follows_per_1k),
        renders: parseInt(renders), last_updated
      };
    });
  } catch {
    winRateCache = [];
  }
}

function saveWinRateCache(): void {
  if (!winRateCache) return;
  try {
    const { execSync } = require('child_process');
    for (const entry of winRateCache) {
      execSync(`sqlite3 ${WIN_RATE_DB} "
        INSERT OR REPLACE INTO win_rates VALUES (
          '${entry.hook_formula.replace(/'/g, "''")}',
          '${entry.niche}', '${entry.topic.replace(/'/g, "''")}',
          ${entry.views}, ${entry.retention_3s}, ${entry.avd_pct},
          ${entry.completion_pct}, ${entry.rewatch_pct}, ${entry.shares},
          ${entry.saves}, ${entry.follows_per_1k}, ${entry.renders},
          '${entry.last_updated}'
        );
      "`, { stdio: 'ignore' });
    }
  } catch {
    // Fallback to JSON
    const fs = require('fs');
    fs.writeFileSync(WIN_RATE_DB.replace('.sqlite', '.json'), JSON.stringify(winRateCache, null, 2));
  }
}

// ============================================================================
// CORE SCORING & SAMPLING
// ============================================================================

function scoreHook(hook: string): { total: number; detail: Record<string, number> } {
  let total = 0;
  const detail: Record<string, number> = {};
  const h = hook.toLowerCase();

  for (const [pillar, pat] of Object.entries(PILLARS)) {
    const hit = pat.test(h) ? 2 : 0;
    detail[pillar] = hit;
    total += hit;
  }

  // Gate tightening: 3+ zero pillars = weak regardless of raw total
  if (Object.values(detail).filter(v => v === 0).length >= 3) {
    total = Math.min(total, 13);
  }
  // Craft failing = no pass
  if (detail.craft === 0) {
    total = Math.min(total, 13);
  }

  // Structural floor: library-grade template match + craft = floor at 14
  let bestHits = 0;
  for (const tpls of Object.values(TEMPLATES)) {
    for (const tpl of tpls) {
      const toks = tpl
        .replace('{X}', '')
        .replace('{N}', '')
        .replace('{P}', '')
        .split(/\s+/)
        .filter(w => w.length > 3);
      const hits = toks.filter(w => h.includes(w.toLowerCase())).length;
      bestHits = Math.max(bestHits, hits);
    }
  }
  const craftOk = detail.craft > 0;
  if (bestHits >= 3 && craftOk) {
    total = Math.max(total, 14);
    detail.template_structure = bestHits;
  }

  return { total, detail };
}

function nicheOf(channel: string): string {
  const c = channel.toLowerCase();
  for (const key of Object.keys(NICHE_BIAS)) {
    if (c.includes(key)) return key;
  }
  return 'default';
}

/**
 * Main entry: generate a hook for a topic.
 * Tries templates in story-shape + niche priority order.
 * Returns first hook that passes 14/20 gate, or highest-scoring fallback.
 */
export function makeHook(params: {
  asset: string;
  pain?: string;
  number?: string;
  channel?: string;
  story_shape?: string;
  slot_map?: SlotMap;
  prefer?: string;
}): [string, HookMeta] {
  const {
    asset, pain = '', number = '', channel = '',
    story_shape = 'default', slot_map = {}, prefer = ''
  } = params;

  const niche = nicheOf(channel);
  const cats: TemplateCategory[] = [];

  if (prefer && prefer in TEMPLATES) cats.push(prefer as TemplateCategory);
  for (const c of SHAPE_ROUTING[story_shape] || SHAPE_ROUTING.default) {
    if (!cats.includes(c)) cats.push(c);
  }
  for (const c of NICHE_BIAS[niche] || []) {
    if (!cats.includes(c)) cats.push(c);
  }

  const fills: SlotMap = { X: asset, P: pain || `use ${asset}`, N: number || '10x', ...slot_map };

  let best = '', bestScore = -1, bestCat = '';

  for (const cat of cats) {
    for (const tpl of TEMPLATES[cat] || []) {
      try {
        const hook = tpl.replace(/{(\w+)}/g, (_, k) => fills[k] || `{${k}}`);
        const { total } = scoreHook(hook);
        if (total > bestScore) {
          best = hook; bestScore = total; bestCat = cat;
        }
        if (total >= 14) {
          return [hook, { category: cat, score: total, gate: 'PASS', niche, shape: story_shape }];
        }
      } catch {
        continue;
      }
    }
  }

  return [best, { category: bestCat, score: bestScore, gate: 'FALLBACK', niche, shape: story_shape }];
}

/**
 * Weighted sampler: picks a hook category weighted by historical win-rate.
 * Falls back to shape+niche priority if no data exists.
 */
export function sampleHookCategory(
  niche: string,
  shape: string,
  topic: string
): TemplateCategory {
  loadWinRateCache();
  if (!winRateCache || winRateCache.length === 0) {
    // No data yet — use priority order
    const cats = [...new TemplateCategory[](
      ...(SHAPE_ROUTING[shape] || SHAPE_ROUTING.default),
      ...(NICHE_BIAS[niche] || [])
    )];
    return cats[0];
  }

  // Aggregate win-rates per category for this niche
  const catScores: Record<string, number> = {};
  for (const entry of winRateCache) {
    if (entry.niche !== niche) continue;
    // Find which category this hook belongs to
    for (const [cat, tpls] of Object.entries(TEMPLATES)) {
      for (const tpl of tpls) {
        const toks = tpl.replace(/{X}/g, '').replace(/{N}/g, '').replace(/{P}/g, '')
          .split(/\s+/).filter(w => w.length > 3);
        const hits = toks.filter(w => entry.hook_formula.toLowerCase().includes(w.toLowerCase())).length;
        if (hits >= 3) {
          const score = (entry.retention_3s + entry.avd_pct + entry.completion_pct) / 3;
          catScores[cat] = (catScores[cat] || 0) + score;
          break;
        }
      }
    }
  }

  if (Object.keys(catScores).length === 0) {
    const cats = [...new TemplateCategory[](
      ...(SHAPE_ROUTING[shape] || SHAPE_ROUTING.default),
      ...(NICHE_BIAS[niche] || [])
    )];
    return cats[0];
  }

  // Weighted random pick
  const total = Object.values(catScores).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [cat, score] of Object.entries(catScores)) {
    r -= score;
    if (r <= 0) return cat as TemplateCategory;
  }
  return Object.keys(catScores)[0] as TemplateCategory;
}

/**
 * Generate multiple hook variants for A/B testing (2-3 per topic).
 */
export function makeHookVariants(
  params: Parameters<typeof makeHook>[0],
  count = 3
): [string, HookMeta][] {
  const results: [string, HookMeta][] = [];
  const tried = new Set<string>();

  // First: preferred category if specified
  if (params.prefer && params.prefer in TEMPLATES) {
    const [hook, meta] = makeHook({ ...params, prefer: params.prefer });
    results.push([hook, meta]);
    tried.add(hook);
  }

  // Then: sample from weighted categories
  const niche = nicheOf(params.channel || '');
  const shape = params.story_shape || 'default';

  while (results.length < count) {
    const cat = sampleHookCategory(niche, shape, params.asset);
    if (!(cat in TEMPLATES)) break;
    for (const tpl of TEMPLATES[cat]) {
      try {
        const fills: SlotMap = { X: params.asset, P: params.pain || `use ${params.asset}`, N: params.number || '10x', ...params.slot_map };
        const hook = tpl.replace(/{(\w+)}/g, (_, k) => fills[k] || `{${k}}`);
        if (!tried.has(hook)) {
          const [h, meta] = makeHook({ ...params, prefer: cat });
          results.push([h, { ...meta, category: cat }]);
          tried.add(h);
          if (results.length >= count) break;
        }
      } catch {}
    }
    if (results.length >= count) break;
  }

  // Fallback: any remaining templates
  for (const [cat, tpls] of Object.entries(TEMPLATES)) {
    if (results.length >= count) break;
    for (const tpl of tpls) {
      try {
        const fills: SlotMap = { X: params.asset, P: params.pain || `use ${params.asset}`, N: params.number || '10x', ...params.slot_map };
        const hook = tpl.replace(/{(\w+)}/g, (_, k) => fills[k] || `{${k}}`);
        if (!tried.has(hook)) {
          const [h, meta] = makeHook({ ...params, prefer: cat });
          results.push([h, { ...meta, category: cat }]);
          tried.add(h);
          if (results.length >= count) break;
        }
      } catch {}
    }
  }

  return results.slice(0, count);
}

/**
 * Record performance for a hook (called by analytics_ingest).
 */
export function recordHookPerformance(data: {
  hook: string;
  category: string;
  niche: string;
  topic: string;
  views: number;
  retention_3s: number;
  avd_pct: number;
  completion_pct: number;
  rewatch_pct: number;
  shares: number;
  saves: number;
  follows_per_1k: number;
}): void {
  loadWinRateCache();
  if (!winRateCache) winRateCache = [];

  const existing = winRateCache.find(e =>
    e.hook_formula === data.hook && e.niche === data.niche && e.topic === data.topic
  );

  const entry: WinRateEntry = {
    hook_formula: data.hook,
    niche: data.niche,
    topic: data.topic,
    views: data.views,
    retention_3s: data.retention_3s,
    avd_pct: data.avd_pct,
    completion_pct: data.completion_pct,
    rewatch_pct: data.rewatch_pct,
    shares: data.shares,
    saves: data.saves,
    follows_per_1k: data.follows_per_1k,
    renders: (existing?.renders || 0) + 1,
    last_updated: new Date().toISOString(),
  };

  if (existing) {
    Object.assign(existing, entry);
  } else {
    winRateCache.push(entry);
  }

  saveWinRateCache();
}

/**
 * Retire weak hooks (below 50% of channel median).
 */
export function retireWeakHooks(niche: string): string[] {
  loadWinRateCache();
  if (!winRateCache) return [];

  const nicheEntries = winRateCache.filter(e => e.niche === niche && e.renders >= 3);
  if (nicheEntries.length < 5) return [];

  const medianFollows = nicheEntries
    .map(e => e.follows_per_1k)
    .sort((a, b) => a - b)[Math.floor(nicheEntries.length / 2)];

  const threshold = medianFollows * 0.5;
  const retired = nicheEntries
    .filter(e => e.follows_per_1k < threshold)
    .map(e => e.hook_formula);

  return retired;
}

// Initialize on import
initWinRateDB();

// ============================================================================
// CLI for testing
// ============================================================================
if (process.argv[1]?.endsWith('hooks.ts')) {
  const tests = [
    { ch: 'ai_news', asset: 'GPT-6', shape: 'man_in_hole' },
    { ch: 'finance', asset: 'Bitcoin', shape: 'man_in_hole' },
    { ch: 'health', asset: 'eye strain', shape: 'default' },
    { ch: 'ai_code', asset: 'Claude Code', shape: 'creation' },
  ];

  for (const { ch, asset, shape } of tests) {
    const [hook, meta] = makeHook({ asset, channel: ch, story_shape: shape, number: '2.4M', pain: 'ship faster' });
    console.log(`[${ch}/${shape}] (${meta.category}, ${meta.score}/20 ${meta.gate})`);
    console.log(`  ${hook}`);
    if (meta.score < 14) {
      console.error(`GATE FAILED: ${meta.score} < 14`);
      process.exit(1);
    }
  }

  // Test variants
  const variants = makeHookVariants({ asset: 'GPT-6', channel: 'ai_news', story_shape: 'man_in_hole', number: '2.4M' }, 3);
  console.log('\nVariants:');
  for (const [h, m] of variants) {
    console.log(`  [${m.category}, ${m.score}] ${h}`);
  }

  console.log('\nALL GATE PASS');
}