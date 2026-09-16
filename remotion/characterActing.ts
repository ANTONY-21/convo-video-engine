/**
 * characterActing.ts — V1 (Master Prompt §8, §5.4, §5.5)
 * Reaction presets and viseme mappings for character animation.
 * Referenced by channel.config.json character.presets.
 *
 * Provides:
 * - Reaction presets: named expressions triggered by script markers
 * - Viseme mappings: lip-sync shapes per provider (IndexTTS2, VoxCPM, XTTS)
 * - Idle behaviors: blinking, micro-movements, breathing
 *
 * Usage:
 *   import { REACTION_PRESETS, VISEME_MAPS, IDLE_DEFAULTS, CharacterPresets } from './characterActing';
 *   const presets = CharacterPresets.forChannel('ai_tech_news');
 */

// ============================================================================
// REACTION PRESETS
// ============================================================================

export type ExpressionName =
  | 'surprise'
  | 'concern'
  | 'agreement'
  | 'thinking'
  | 'excitement'
  | 'skepticism'
  | 'neutral';

export interface ReactionPreset {
  expression: ExpressionName;
  duration_frames: number;  // at 30fps
  intensity: number;        // 0.0 - 1.0
  trigger_keywords: string[];
  // Optional: blend curve for smooth transitions
  ease_in_frames?: number;
  ease_out_frames?: number;
}

// Universal reaction presets (can be overridden per-channel)
export const REACTION_PRESETS: Record<string, ReactionPreset> = {
  // Surprise / Hook reaction
  hook_reaction: {
    expression: 'surprise',
    duration_frames: 15,   // 0.5s
    intensity: 0.9,
    trigger_keywords: ['stop', 'wait', 'breaking', 'just', 'shocking', 'unbelievable', 'never', 'secret'],
    ease_in_frames: 3,
    ease_out_frames: 5,
  },

  // Concern / Warning reaction
  warning_reaction: {
    expression: 'concern',
    duration_frames: 20,   // 0.67s
    intensity: 0.7,
    trigger_keywords: ['warning', 'danger', 'risk', 'mistake', 'wrong', 'avoid', 'stop doing', 'damaging'],
    ease_in_frames: 5,
    ease_out_frames: 8,
  },

  // Agreement / Validation reaction
  agreement_reaction: {
    expression: 'agreement',
    duration_frames: 12,   // 0.4s
    intensity: 0.6,
    trigger_keywords: ['exactly', 'right', 'correct', 'yes', 'precisely', 'absolutely', 'confirmed', 'proven'],
    ease_in_frames: 3,
    ease_out_frames: 4,
  },

  // Thinking / Analysis reaction
  thinking_reaction: {
    expression: 'thinking',
    duration_frames: 25,   // 0.83s
    intensity: 0.5,
    trigger_keywords: ['why', 'how', 'because', 'reason', 'data shows', 'research', 'study', 'analysis', 'think about'],
    ease_in_frames: 5,
    ease_out_frames: 10,
  },

  // Excitement / Reveal reaction
  excitement_reaction: {
    expression: 'excitement',
    duration_frames: 18,   // 0.6s
    intensity: 0.8,
    trigger_keywords: ['amazing', 'incredible', 'breakthrough', 'game changer', 'revolutionary', 'first time', 'new'],
    ease_in_frames: 3,
    ease_out_frames: 6,
  },

  // Skepticism / Contrarian reaction
  skepticism_reaction: {
    expression: 'skepticism',
    duration_frames: 20,   // 0.67s
    intensity: 0.6,
    trigger_keywords: ['really', 'actually', 'but', 'however', 'contrary', 'myth', 'everyone thinks', 'supposedly'],
    ease_in_frames: 4,
    ease_out_frames: 6,
  },

  // Neutral / Default
  neutral_reaction: {
    expression: 'neutral',
    duration_frames: 8,    // 0.27s
    intensity: 0.2,
    trigger_keywords: [],
    ease_in_frames: 2,
    ease_out_frames: 3,
  },
};

// ============================================================================
// VISEME MAPS (Lip-sync)
// ============================================================================

export type VisemeName =
  | 'sil'   // silence
  | 'PP'    // bilabial: p, b, m
  | 'FF'    // labiodental: f, v
  | 'TH'    // dental: th, dh
  | 'DD'    // alveolar: t, d, n, l, s, z
  | 'kk'    // velar: k, g, ng
  | 'CH'    // postalveolar: ch, jh, sh, zh
  | 'SS'    // alveolar fricative: s, z
  | 'nn'    // nasal: n, m, ng
  | 'RR'    // r-colored: r, er
  | 'aa'    // open: a, aa, ae
  | 'E'     // mid-front: eh, ey
  | 'I'     // close-front: ih, iy
  | 'O'     // mid-back: ao, ow
  | 'U'     // close-back: uh, uw;

export interface VisemeSpec {
  mouth_shape: VisemeName;
  duration_ms: number;      // base duration per phoneme
  blend_frames: number;     // frames to blend between visemes (at 30fps)
}

// IndexTTS2 viseme map (22 visemes - provider standard)
export const VISEME_MAP_INDEXTTS2: Record<VisemeName, VisemeSpec> = {
  sil:  { mouth_shape: 'sil', duration_ms: 80,  blend_frames: 3 },
  PP:   { mouth_shape: 'PP',  duration_ms: 120, blend_frames: 4 },
  FF:   { mouth_shape: 'FF',  duration_ms: 100, blend_frames: 3 },
  TH:   { mouth_shape: 'TH',  duration_ms: 110, blend_frames: 3 },
  DD:   { mouth_shape: 'DD',  duration_ms: 90,  blend_frames: 3 },
  kk:   { mouth_shape: 'kk',  duration_ms: 100, blend_frames: 3 },
  CH:   { mouth_shape: 'CH',  duration_ms: 110, blend_frames: 4 },
  SS:   { mouth_shape: 'SS',  duration_ms: 100, blend_frames: 3 },
  nn:   { mouth_shape: 'nn',  duration_ms: 100, blend_frames: 3 },
  RR:   { mouth_shape: 'RR',  duration_ms: 120, blend_frames: 4 },
  aa:   { mouth_shape: 'aa',  duration_ms: 140, blend_frames: 5 },
  E:    { mouth_shape: 'E',   duration_ms: 120, blend_frames: 4 },
  I:    { mouth_shape: 'I',   duration_ms: 100, blend_frames: 3 },
  O:    { mouth_shape: 'O',   duration_ms: 130, blend_frames: 4 },
  U:    { mouth_shape: 'U',   duration_ms: 120, blend_frames: 4 },
};

// VoxCPM viseme map (simplified - uses phoneme timing from alignment)
export const VISEME_MAP_VOXCPM: Record<string, VisemeSpec> = {
  // VoxCPM provides phoneme-level timing, we map to visemes
  'p':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'b':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'm':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'f':  { mouth_shape: 'FF', duration_ms: 90,  blend_frames: 3 },
  'v':  { mouth_shape: 'FF', duration_ms: 90,  blend_frames: 3 },
  'th': { mouth_shape: 'TH', duration_ms: 100, blend_frames: 3 },
  'dh': { mouth_shape: 'TH', duration_ms: 100, blend_frames: 3 },
  't':  { mouth_shape: 'DD', duration_ms: 80,  blend_frames: 2 },
  'd':  { mouth_shape: 'DD', duration_ms: 80,  blend_frames: 2 },
  'n':  { mouth_shape: 'nn', duration_ms: 90,  blend_frames: 3 },
  'l':  { mouth_shape: 'DD', duration_ms: 90,  blend_frames: 3 },
  's':  { mouth_shape: 'SS', duration_ms: 90,  blend_frames: 3 },
  'z':  { mouth_shape: 'SS', duration_ms: 90,  blend_frames: 3 },
  'k':  { mouth_shape: 'kk', duration_ms: 90,  blend_frames: 3 },
  'g':  { mouth_shape: 'kk', duration_ms: 90,  blend_frames: 3 },
  'ng': { mouth_shape: 'nn', duration_ms: 100, blend_frames: 3 },
  'ch': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'jh': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'sh': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'zh': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'r':  { mouth_shape: 'RR', duration_ms: 110, blend_frames: 4 },
  'er': { mouth_shape: 'RR', duration_ms: 110, blend_frames: 4 },
  'a':  { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'ae': { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'ah': { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'eh': { mouth_shape: 'E',  duration_ms: 110, blend_frames: 3 },
  'ey': { mouth_shape: 'E',  duration_ms: 110, blend_frames: 3 },
  'ih': { mouth_shape: 'I',  duration_ms: 90,  blend_frames: 3 },
  'iy': { mouth_shape: 'I',  duration_ms: 90,  blend_frames: 3 },
  'ao': { mouth_shape: 'O',  duration_ms: 120, blend_frames: 4 },
  'ow': { mouth_shape: 'O',  duration_ms: 120, blend_frames: 4 },
  'uh': { mouth_shape: 'U',  duration_ms: 110, blend_frames: 3 },
  'uw': { mouth_shape: 'U',  duration_ms: 110, blend_frames: 3 },
  'pau': { mouth_shape: 'sil', duration_ms: 80,  blend_frames: 3 },  // pause
};

// XTTS v2 viseme map (Coqui standard)
export const VISEME_MAP_XTTS: Record<string, VisemeSpec> = {
  // Similar to VoxCPM but with XTTS phoneme set
  'p':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'b':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'm':  { mouth_shape: 'PP', duration_ms: 100, blend_frames: 3 },
  'f':  { mouth_shape: 'FF', duration_ms: 90,  blend_frames: 3 },
  'v':  { mouth_shape: 'FF', duration_ms: 90,  blend_frames: 3 },
  'θ':  { mouth_shape: 'TH', duration_ms: 100, blend_frames: 3 },
  'ð':  { mouth_shape: 'TH', duration_ms: 100, blend_frames: 3 },
  't':  { mouth_shape: 'DD', duration_ms: 80,  blend_frames: 2 },
  'd':  { mouth_shape: 'DD', duration_ms: 80,  blend_frames: 2 },
  'n':  { mouth_shape: 'nn', duration_ms: 90,  blend_frames: 3 },
  'l':  { mouth_shape: 'DD', duration_ms: 90,  blend_frames: 3 },
  's':  { mouth_shape: 'SS', duration_ms: 90,  blend_frames: 3 },
  'z':  { mouth_shape: 'SS', duration_ms: 90,  blend_frames: 3 },
  'k':  { mouth_shape: 'kk', duration_ms: 90,  blend_frames: 3 },
  'g':  { mouth_shape: 'kk', duration_ms: 90,  blend_frames: 3 },
  'ŋ':  { mouth_shape: 'nn', duration_ms: 100, blend_frames: 3 },
  'tʃ': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'dʒ': { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'ʃ':  { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'ʒ':  { mouth_shape: 'CH', duration_ms: 100, blend_frames: 3 },
  'r':  { mouth_shape: 'RR', duration_ms: 110, blend_frames: 4 },
  'ɹ':  { mouth_shape: 'RR', duration_ms: 110, blend_frames: 4 },
  'ɑ':  { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'æ':  { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'ʌ':  { mouth_shape: 'aa', duration_ms: 130, blend_frames: 4 },
  'ɛ':  { mouth_shape: 'E',  duration_ms: 110, blend_frames: 3 },
  'eɪ': { mouth_shape: 'E',  duration_ms: 110, blend_frames: 3 },
  'ɪ':  { mouth_shape: 'I',  duration_ms: 90,  blend_frames: 3 },
  'i':  { mouth_shape: 'I',  duration_ms: 90,  blend_frames: 3 },
  'ɔ':  { mouth_shape: 'O',  duration_ms: 120, blend_frames: 4 },
  'oʊ': { mouth_shape: 'O',  duration_ms: 120, blend_frames: 4 },
  'ʊ':  { mouth_shape: 'U',  duration_ms: 110, blend_frames: 3 },
  'u':  { mouth_shape: 'U',  duration_ms: 110, blend_frames: 3 },
  'pau': { mouth_shape: 'sil', duration_ms: 80,  blend_frames: 3 },
};

// Aggregate viseme maps by provider
export const VISEME_MAPS = {
  indextts2: VISEME_MAP_INDEXTTS2,
  voxcpm: VISEME_MAP_VOXCPM,
  xtts: VISEME_MAP_XTTS,
  piper: VISEME_MAP_VOXCPM, // Piper uses similar phoneme set
} as const;

// ============================================================================
// IDLE BEHAVIORS
// ============================================================================

export interface IdleConfig {
  blink_interval: number;     // seconds between blinks (2-8s)
  blink_duration_frames: number; // frames for blink (at 30fps)
  micro_movements: boolean;   // subtle head/eye movement
  micro_movement_range: number;  // degrees of rotation
  breathing: boolean;         // subtle chest/shoulder movement
  breathing_cycle_sec: number;   // seconds per breath cycle
  gaze_shift_interval: number;   // seconds between gaze shifts
  gaze_shift_range: number;      // degrees
}

export const IDLE_DEFAULTS: IdleConfig = {
  blink_interval: 4.0,
  blink_duration_frames: 6,    // ~0.2s at 30fps
  micro_movements: true,
  micro_movement_range: 2.0,
  breathing: true,
  breathing_cycle_sec: 4.5,
  gaze_shift_interval: 3.0,
  gaze_shift_range: 5.0,
};

// Personality-specific idle overrides
export const PERSONALITY_IDLE: Record<string, Partial<IdleConfig>> = {
  analytical: {
    blink_interval: 5.0,
    micro_movement_range: 1.0,
    breathing_cycle_sec: 5.0,
    gaze_shift_interval: 4.0,
    gaze_shift_range: 3.0,
  },
  enthusiastic: {
    blink_interval: 3.0,
    micro_movement_range: 3.0,
    breathing_cycle_sec: 3.5,
    gaze_shift_interval: 2.0,
    gaze_shift_range: 8.0,
  },
  calm: {
    blink_interval: 6.0,
    micro_movement_range: 0.5,
    breathing_cycle_sec: 6.0,
    gaze_shift_interval: 5.0,
    gaze_shift_range: 2.0,
  },
  witty: {
    blink_interval: 3.5,
    micro_movement_range: 2.5,
    breathing_cycle_sec: 4.0,
    gaze_shift_interval: 2.5,
    gaze_shift_range: 6.0,
  },
  authoritative: {
    blink_interval: 5.5,
    micro_movement_range: 0.8,
    breathing_cycle_sec: 5.5,
    gaze_shift_interval: 4.5,
    gaze_shift_range: 2.5,
  },
  curious: {
    blink_interval: 3.0,
    micro_movement_range: 2.0,
    breathing_cycle_sec: 4.0,
    gaze_shift_interval: 2.0,
    gaze_shift_range: 7.0,
  },
};

// ============================================================================
// CHANNEL PRESETS FACTORY
// ============================================================================

export interface CharacterPresets {
  reactions: Record<string, ReactionPreset>;
  visemes: Record<string, VisemeSpec>;
  idle: IdleConfig;
  avatar_image: string;
  name: string;
  personality: string;
}

/**
 * Build complete character presets for a channel.
 * Merges universal defaults with channel-specific overrides.
 */
export class CharacterPresetsFactory {
  private channelConfig: any;

  constructor(channelConfig: any) {
    this.channelConfig = channelConfig;
  }

  build(): CharacterPresets {
    const char = this.channelConfig.character || {};
    const personality = char.personality || 'analytical';
    const avatar = char.avatar_image || 'assets/avatars/default.png';

    // Merge reactions
    const reactions = { ...REACTION_PRESETS };
    if (char.presets?.reactions) {
      Object.assign(reactions, char.presets.reactions);
    }

    // Get viseme map for voice provider
    const voiceProvider = this.channelConfig.voice?.provider || 'indextts2';
    const visemes = VISEME_MAPS[voiceProvider as keyof typeof VISEME_MAPS] || VISEME_MAP_INDEXTTS2;

    // Build idle config
    const idle = { ...IDLE_DEFAULTS, ...PERSONALITY_IDLE[personality] };
    if (char.presets?.idle) {
      Object.assign(idle, char.presets.idle);
    }

    return {
      reactions,
      visemes,
      idle,
      avatar_image: avatar,
      name: char.name || 'Host',
      personality,
    };
  }

  /**
   * Get reaction for a script segment based on trigger keywords.
   * Returns the highest-intensity matching reaction.
   */
  getReactionForText(text: string): ReactionPreset {
    const lower = text.toLowerCase();
    let best: ReactionPreset = REACTION_PRESETS.neutral_reaction;
    let bestIntensity = -1;

    for (const [, preset] of Object.entries(this.build().reactions)) {
      for (const kw of preset.trigger_keywords) {
        if (lower.includes(kw.toLowerCase())) {
          if (preset.intensity > bestIntensity) {
            best = preset;
            bestIntensity = preset.intensity;
          }
        }
      }
    }

    return best;
  }
}

/**
 * Convenience function for quick access.
 */
export function CharacterPresetsForChannel(channelId: string, channelConfig: any): CharacterPresets {
  return new CharacterPresetsFactory(channelConfig).build();
}

// ============================================================================
// ANIMATION CURVES (for smooth transitions)
// ============================================================================

export type EaseFn = (t: number) => number;

export const EASE_CURVES: Record<string, EaseFn> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  elasticOut: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/**
 * Generate keyframes for a reaction animation.
 */
export function generateReactionKeyframes(
  preset: ReactionPreset,
  fps: number = 30
): Array<{ frame: number; intensity: number; expression: ExpressionName }> {
  const keyframes: Array<{ frame: number; intensity: number; expression: ExpressionName }> = [];
  const totalFrames = preset.duration_frames;
  const easeIn = preset.ease_in_frames || 3;
  const easeOut = preset.ease_out_frames || 3;
  const holdFrames = totalFrames - easeIn - easeOut;

  // Ease in
  for (let f = 0; f < easeIn; f++) {
    const t = f / Math.max(1, easeIn);
    const intensity = EASE_CURVES.easeOutCubic(t) * preset.intensity;
    keyframes.push({ frame: f, intensity, expression: preset.expression });
  }

  // Hold
  for (let f = 0; f < holdFrames; f++) {
    keyframes.push({ frame: easeIn + f, intensity: preset.intensity, expression: preset.expression });
  }

  // Ease out
  for (let f = 0; f < easeOut; f++) {
    const t = f / Math.max(1, easeOut);
    const intensity = (1 - EASE_CURVES.easeOutCubic(t)) * preset.intensity;
    keyframes.push({ frame: easeIn + holdFrames + f, intensity, expression: preset.expression });
  }

  return keyframes;
}

// ============================================================================
// CLI for testing
// ============================================================================
if (process.argv[1]?.endsWith('characterActing.ts')) {
  // Test reaction detection
  const testTexts = [
    "STOP doing this with AI right now!",
    "The data shows this is completely wrong.",
    "This is absolutely incredible and amazing!",
    "But wait, everyone thinks this... actually it's a myth.",
    "Here is the analysis of why this happens.",
    "This is a normal sentence with no triggers.",
  ];

  const factory = new CharacterPresetsFactory({
    voice: { provider: 'indextts2' },
    character: { personality: 'analytical', avatar_image: 'test.png', presets: {} }
  });
  const presets = factory.build();

  console.log('=== Reaction Detection Tests ===');
  for (const text of testTexts) {
    const reaction = factory.getReactionForText(text);
    console.log(`"${text}"`);
    console.log(`  -> ${reaction.expression} (intensity: ${reaction.intensity}, duration: ${reaction.duration_frames} frames)`);
  }

  console.log('\n=== Keyframe Generation Test ===');
  const kf = generateReactionKeyframes(presets.reactions.hook_reaction);
  console.log(`Hook reaction: ${kf.length} keyframes`);
  console.log(`  Start: frame ${kf[0].frame}, intensity ${kf[0].intensity.toFixed(2)}`);
  console.log(`  Peak: frame ${kf[Math.floor(kf.length/2)].frame}, intensity ${kf[Math.floor(kf.length/2)].intensity.toFixed(2)}`);
  console.log(`  End: frame ${kf[kf.length-1].frame}, intensity ${kf[kf.length-1].intensity.toFixed(2)}`);

  console.log('\n=== Viseme Map Test (IndexTTS2) ===');
  console.log(Object.keys(VISEME_MAP_INDEXTTS2).join(', '));

  console.log('\n=== ALL TESTS PASS ===');
}