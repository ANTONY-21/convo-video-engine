/**
 * interruptScheduler.ts — V2 (Master Prompt 5.2): one pattern interrupt
 * every 5-7s minimum, implemented as a zoom punch at each beat midpoint
 * (1 -> 1.06 -> 1 over 10 frames, spring-ish ease) + optional colour flip.
 *
 * Usage (in SceneScene):
 *   const punch = useZoomPunch(beat.frames);
 *   <AbsoluteFill style={{ transform: `scale(${punch})` }}>...
 * The scheduler ALSO exposes scheduleInterrupts(totalFrames) for the
 * SFX layer: returns midpoints so a whoosh/tick can land on each punch.
 */
export function beatMidpoint(frames: number): number {
  return Math.floor(frames / 2);
}

/** Zoom punch factor for the current frame within a beat (1 = none). */
export function useZoomPunchMath(frame: number, beatFrames: number): number {
  const mid = beatMidpoint(beatFrames);
  const width = parseInt(process.env.INTERRUPT_PUNCH_FRAMES ?? '10', 10);
  const depth = parseFloat(process.env.INTERRUPT_PUNCH_DEPTH ?? '0.06');
  const d = Math.abs(frame - mid);
  if (d > width / 2) return 1;
  // triangle envelope: 1 -> 1+depth at mid -> 1
  const t = 1 - d / (width / 2);
  const eased = t * t * (3 - 2 * t); // smoothstep
  return 1 + depth * eased;
}

/** All interrupt times (seconds) for a beat list — feeds the SFX track. */
export function scheduleInterrupts(beats: {start: number; frames: number}[], fps = 30): number[] {
  return beats.map(b => (b.start + beatMidpoint(b.frames)) / fps);
}
