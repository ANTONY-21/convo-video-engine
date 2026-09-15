/** convo3 kinetic — 13 beats, ≤2.5s each, zoom punches, aggressive captions.
 * Scenes: night_scroll (phone glow, dark room), red_eye (burning eye anim),
 * stat (15→5 blink counter), fix (20-20-20 card). Loop ending = same visual
 * as opening (night_scroll + dark) so the video restarts seamlessly.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, Sequence } from 'remotion';

export interface Beat {
  id: number; start: number; frames: number;
  vo: string; caption: string; zoom: number; sfx: string; scene: string;
  speaker: string;
}
export interface ConvoData {
  topicId: string; fps: number; beats: Beat[];
  disclaimer: { text: string; fromFrame: number };
}

const INK = '#141414';
const RED = '#E23B2E';
const GLOW = '#4A5D7E';

// ---------- scenes ----------
const NightScroll: React.FC<{ f: number; zoom: number }> = ({ f, zoom }) => {
  const drift = Math.sin(f / 14) * 6;
  const glow = 0.55 + Math.sin(f / 9) * 0.18;
  const feedY = (f * 5.5) % 260;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0E14' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 42%, rgba(74,93,126,${glow}) 0%, rgba(11,14,20,1) 62%)` }} />
      {/* phone */}
      <div style={{ position: 'absolute', left: '50%', top: '46%', transform: `translate(-50%,-50%) scale(${zoom})`, width: 300, height: 560, borderRadius: 34, background: '#101623', border: '5px solid #232D40', boxShadow: '0 0 90px rgba(120,150,210,0.35)' }}>
        {/* scrolling feed cards */}
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: 'absolute', left: 24, width: 252, height: 120, top: 30 + i * 170 - feedY + 260, borderRadius: 14, background: '#1A2334', opacity: 0.9 }}>
            <div style={{ position: 'absolute', left: 14, top: 14, width: 120, height: 12, borderRadius: 6, background: '#2C3A55' }} />
            <div style={{ position: 'absolute', left: 14, top: 38, width: 200, height: 10, borderRadius: 5, background: '#24304A' }} />
            <div style={{ position: 'absolute', left: 14, top: 58, width: 170, height: 10, borderRadius: 5, background: '#24304A' }} />
          </div>
        ))}
      </div>
      {/* viewer silhouette bob */}
      <div style={{ position: 'absolute', left: '50%', bottom: 40, transform: `translateX(-50%) translateY(${drift * 0.4}px)`, width: 220, height: 150, borderRadius: '110px 110px 0 0', background: '#05070B' }} />
    </AbsoluteFill>
  );
};

const RedEye: React.FC<{ f: number; zoom: number }> = ({ f, zoom }) => {
  const pulse = 1 + Math.sin(f / 3.2) * 0.07;
  const veins = [0, 1, 2, 3, 4];
  const grow = Math.min(1, f / 16);
  return (
    <AbsoluteFill style={{ backgroundColor: '#120607' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, rgba(226,59,46,${0.25 * grow}) 0%, rgba(18,6,7,1) 70%)` }} />
      {/* eye white */}
      <div style={{ position: 'absolute', left: '50%', top: '44%', transform: `translate(-50%,-50%) scale(${zoom * pulse})`, width: 480, height: 300, borderRadius: '50%', background: '#F5EDE6', border: `6px solid ${INK}`, overflow: 'hidden' }}>
        {/* iris + pupil */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, #6B3220 30%, #3E1D12 70%)' }}>
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 64, height: 64, borderRadius: '50%', background: '#0A0505' }} />
        </div>
        {/* veins growing in */}
        {veins.map((i) => (
          <div key={i} style={{
            position: 'absolute', left: `${8 + i * 20}%`, top: `${14 + (i % 2) * 55}%`,
            width: `${(26 + i * 9) * grow}%`, height: 7, borderRadius: 4,
            background: RED, transform: `rotate(${(i - 2) * 16}deg)`, opacity: 0.85,
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const StatScene: React.FC<{ f: number; lf: number; frames: number }> = ({ f, lf, frames }) => {
  const half = Math.floor(frames / 2);
  const big = lf < half ? '15' : '5';
  const color = lf < half ? '#7BC47F' : '#FF3B30';
  const scale = lf === half ? 1.5 : 1;
  return (
    <AbsoluteFill style={{ backgroundColor: '#0B0E14', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 90, fontWeight: 700, color: '#5A6B85', fontFamily: 'Arial', letterSpacing: 4 }}>BLINKS / MIN</div>
      <div style={{ fontSize: 420, fontWeight: 900, color, fontFamily: 'Arial', lineHeight: 1, transform: `scale(${interpolate(lf, [half - 1, half], [1, scale], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`, transition: 'none' }}>{big}</div>
      {/* count flicker */}
      <div style={{ position: 'absolute', bottom: '18%', display: 'flex', gap: 10 }}>
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} style={{ width: 14, height: 14, borderRadius: 7, background: i < (lf < half ? 15 : 5) ? color : '#1E2839' }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FixScene: React.FC<{ lf: number; beat: Beat }> = ({ lf, beat }) => {
  const pop = interpolate(lf, [0, 10], [0.6, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2)) });
  const step = beat.id - 9; // 1..3 (b9 is the intro)
  return (
    <AbsoluteFill style={{ backgroundColor: '#07110B', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(52,199,123,0.16) 0%, rgba(7,17,11,1) 68%)' }} />
      <div style={{ transform: `scale(${pop})`, textAlign: 'center' }}>
        <div style={{ fontSize: 200, fontWeight: 900, color: '#34C77B', fontFamily: 'Arial', lineHeight: 1 }}>20-20-20</div>
        <div style={{ fontSize: 56, fontWeight: 700, color: '#CDE8D8', fontFamily: 'Arial', marginTop: 20 }}>
          {step === 1 ? 'EVERY 20 MINUTES' : step === 2 ? 'LOOK 20 FEET AWAY' : step === 3 ? 'FOR 20 SECONDS' : 'THE RULE THAT SAVES EYES'}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- aggressive caption (2 lines max, huge, caps) ----------
const AggroCaption: React.FC<{ text: string; lf: number; frames: number }> = ({ text, lf, frames }) => {
  const inS = interpolate(lf, [0, 3], [0.4, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(2.2)) });
  const wobble = Math.sin(lf / 2.5) * 0.015;
  const nearEnd = lf > frames - 8;
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '17%', transform: `translateX(-50%) scale(${nearEnd ? 1.06 : inS})`,
      textAlign: 'center', width: '92%', zIndex: 40, fontFamily: 'Arial Black, Arial, sans-serif',
    }}>
      <span style={{
        fontSize: 76, fontWeight: 900, color: '#FFFFFF', textTransform: 'uppercase',
        WebkitTextStroke: '3px #000',
        textShadow: '0 6px 0 rgba(0,0,0,0.85)',
        display: 'inline', boxDecorationBreak: 'clone', padding: '2px 10px',
        background: text.startsWith('⚠') ? 'rgba(226,59,46,0.85)' : 'transparent',
        borderRadius: 12,
      }}>{text}</span>
    </div>
  );
};

// ---------- main ----------
export const Convo3Main: React.FC<{ data: ConvoData }> = ({ data }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beat = data.beats.find((b) => frame >= b.start && frame < b.start + b.frames) ?? data.beats[0];
  const lf = frame - beat.start;
  const zoom = beat.zoom * (1 + Math.sin(lf / 7) * 0.015); // continuous micro-motion

  // engagement: hard shake on impact beats (b4,b5,b7) for first 6 frames
  const shake = ['red_eye', 'stat'].includes(beat.scene) && lf < 6
    ? Math.sin(lf * 40) * 8 * (1 - lf / 6) : 0;
  // pattern interrupt: 2-frame white flash + zoom jump on impact beats
  const flashInterrupt = [3, 5, 7, 10].includes(beat.id) && lf < 2;
  return (
    <AbsoluteFill style={{
      backgroundColor: flashInterrupt ? '#fff' : '#000',
      transform: `translateY(${shake}px) scale(${flashInterrupt ? 1.06 : 1})`,
    }}>
      {beat.scene === 'night_scroll' && <NightScroll f={frame} zoom={zoom} />}
      {beat.scene === 'red_eye' && <RedEye f={frame} zoom={zoom} />}
      {beat.scene === 'stat' && <StatScene f={frame} lf={lf} frames={beat.frames} />}
      {beat.scene === 'fix' && <FixScene lf={lf} beat={beat} />}

      <AggroCaption text={beat.caption} lf={lf} frames={beat.frames} />

      {/* A3 persistent disclaimer */}
      <div style={{ position: 'absolute', top: '4%', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#C9CDD4', borderRadius: 999, padding: '5px 18px', fontSize: 22, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 50, fontFamily: 'Arial' }}>
        {data.disclaimer.text}
      </div>
    </AbsoluteFill>
  );
};
