import React from 'react';
import { Shot1Phone, Shot2ManWindow } from './shot12_scenes';
import { BrollLensNight, BrollCaseMorning } from './shot_lenses';
import { WordAnchoredCaptions } from './WordAnchoredCaptions';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Sequence } from 'remotion';

// ============================================================================
// Xiaohei conversation format — new story engine (2026-09-08, kanban t_3269a562)
// Character style: "Xiaohei" IP from helloianneo/ian-xiaohei-illustrations
// (11.2k★ MIT): solid black body, white dot eyes, thin limbs, deadpan expression.
// Two characters talk in speech bubbles across 5 hand-drawn backgrounds.
// Dialogue architecture after AIComicBuilder (Apache-2.0): beats have speaker,
// bubble lines, and a per-beat visual card. ALL on-screen text/numbers come
// from data (single source of truth) — nothing hardcoded.
// ============================================================================

export interface ConvoBeat {
  id: number; start: number; frames: number; scene: string;
  speaker: 'RAVI' | 'VIKRAM'; bubble: string[];
  visual?: { kind: string; [k: string]: any };
}
export interface ConvoData {
  beats: ConvoBeat[];
  size: { w: number; h: number; fps: number };
}

const INK = '#141414';
const PAPER = '#FAF7F0';
const RED = '#D64541';
const TEAL = '#0F7B6C';
const ORANGE = '#E8842A';
const BLUE = '#2B6CB0';
const GREEN = '#2F855A';

export const SPEAKER_META: Record<string, { color: string; side: 'left' | 'right'; accent: 'scarf' | 'cap' }> = {
  RAVI: { color: RED, side: 'left', accent: 'scarf' },
  VIKRAM: { color: TEAL, side: 'right', accent: 'cap' },
  NARRATOR: { color: '#B7791F', side: 'right', accent: 'cap' },
};

// ---------------- Xiaohei character ----------------
export const Xiaohei: React.FC<{
  frame: number; scale?: number; flip?: boolean; talking?: boolean;
  accent: 'scarf' | 'cap'; accentColor: string; opacity?: number;
}> = ({ frame, scale = 1, flip = false, talking = false, accent, accentColor, opacity = 1 }) => {
  const bob = Math.sin(frame / 11) * 3;
  const blink = (frame % 97) < 4 ? 0.15 : 1;
  const armSwing = talking ? Math.sin(frame / 5) * 10 : Math.sin(frame / 22) * 3;
  const mouthH = talking ? 4 + Math.abs(Math.sin(frame / 3)) * 9 : 2.5;
  return (
    <g transform={`translate(0 ${bob}) scale(${flip ? -scale : scale} ${scale})`} opacity={opacity}>
      {/* legs */}
      <line x1={-16} y1={58} x2={-20} y2={92} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      <line x1={16} y1={58} x2={20} y2={92} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      {/* arms */}
      <g transform={`rotate(${-armSwing} -34 8)`}>
        <line x1={-34} y1={8} x2={-58} y2={-14 + (talking ? -8 : 0)} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
      <g transform={`rotate(${armSwing} 34 8)`}>
        <line x1={34} y1={8} x2={58} y2={-14 + (talking ? -8 : 0)} stroke={INK} strokeWidth={5} strokeLinecap="round" />
      </g>
      {/* body */}
      <ellipse cx={0} cy={0} rx={52} ry={62} fill={INK} />
      {/* eyes: white dots */}
      <g transform={`scale(1 ${blink})`}>
        <circle cx={-15} cy={-22} r={11} fill="#fff" />
        <circle cx={15} cy={-22} r={11} fill="#fff" />
        <circle cx={-12} cy={-21} r={4.5} fill={INK} />
        <circle cx={18} cy={-21} r={4.5} fill={INK} />
      </g>
      {/* mouth: deadpan line or talking ellipse */}
      {talking ? (
        <ellipse cx={2} cy={2} rx={7} ry={mouthH / 2} fill="#fff" />
      ) : (
        <line x1={-6} y1={2} x2={10} y2={2} stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      )}
      {/* accent */}
      {accent === 'scarf' ? (
        <path d="M -38 22 Q 0 40 38 22" stroke={accentColor} strokeWidth={9} fill="none" strokeLinecap="round" />
      ) : (
        <g>
          <rect x={-30} y={-46} width={62} height={9} rx={4} fill={accentColor} />
          <rect x={-16} y={-56} width={34} height={12} rx={5} fill={accentColor} />
        </g>
      )}
    </g>
  );
};

// ---------------- Speech bubble ----------------
export const Bubble: React.FC<{
  lines: string[]; x: number; y: number; tailX: number; color: string;
  name: string; frame: number; width?: number;
}> = ({ lines, x, y, tailX, color, name, frame, width = 470 }) => {
  const pop = interpolate(frame, [0, 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6)) });
  const lineH = 44;
  const pad = 22;
  const h = pad * 2 + lines.length * lineH + 26; // + name tag overlap
  const fs = 30;
  return (
    <g transform={`translate(${x} ${y}) scale(${pop})`} transform-origin={`${width / 2} ${h}`}>
      <g transform={`rotate(${Math.sin(x) * 0.7})`}>
        <rect x={0} y={0} width={width} height={h} rx={22} fill="#fff" stroke={INK} strokeWidth={5} />
        <path d={`M ${tailX - 14} ${h - 2} L ${tailX} ${h + 26} L ${tailX + 14} ${h - 2} Z`} fill="#fff" stroke={INK} strokeWidth={5} />
        <rect x={tailX - 12} y={h - 5} width={24} height={8} fill="#fff" />
        {/* name tag */}
        <g>
          <rect x={14} y={-14} width={26 + name.length * 13} height={34} rx={9} fill={color} />
          <text x={14 + (26 + name.length * 13) / 2} y={10} textAnchor="middle" fontSize={21} fontWeight={800} fill="#fff" fontFamily="Arial, sans-serif">{name}</text>
        </g>
        {/* text lines, staggered pop-in */}
        {lines.map((ln, i) => {
          const lp = interpolate(frame, [4 + i * 8, 12 + i * 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
          return (
            <text key={i} x={width / 2} y={52 + i * lineH} textAnchor="middle" fontSize={fs}
              fontWeight={i === lines.length - 1 && lines.length > 1 ? 800 : 600}
              fill={INK} fontFamily="Arial, sans-serif" opacity={lp}
              transform={`translate(0 ${(1 - lp) * 14})`}>
              {ln}
            </text>
          );
        })}
      </g>
    </g>
  );
};

// ---------------- Visual cards (hand-drawn annotation style) ----------------
export const Card: React.FC<{ frame: number; delay?: number; children: React.ReactNode; x: number; y: number; w: number; h: number; rot?: number }> =
({ frame, delay = 14, children, x, y, w, h, rot = -1.2 }) => {
  const p = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  // V2 micro-motion law: idle breathing after entrance (never a still
  // card — spec: static frames < 20%)
  const breathe = 1 + 0.006 * Math.sin((frame - delay) / 7);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${p * breathe})`} opacity={p}>
      <rect x={0} y={0} width={w} height={h} rx={16} fill="#fff" stroke={INK} strokeWidth={5} />
      {children}
    </g>
  );
};

const BigStat: React.FC<{ label: string; value: string; color: string; x: number; y: number }> = ({ label, value, color, x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <text x={0} y={0} fontSize={19} fontWeight={700} fill="#666" fontFamily="Arial">{label}</text>
    <text x={0} y={38} fontSize={40} fontWeight={900} fill={color} fontFamily="Arial">{value}</text>
  </g>
);

// ---------------- Backgrounds (5 distinct hand-drawn scenes) ----------------
const SkyGrad: React.FC<{ top: string; bottom: string }> = ({ top, bottom }) => (
  <>
    <defs>
      <linearGradient id={`sky-${top.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={top} /><stop offset="100%" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect width={704} height={1280} fill={`url(#sky-${top.replace('#', '')})`} />
  </>
);

const TeaStall: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <SkyGrad top="#FFF3DC" bottom="#FFE3B3" />
    {/* sun */}
    <circle cx={620} cy={140} r={54} fill={ORANGE} opacity={0.85} />
    {/* ground */}
    <rect y={1020} width={704} height={260} fill="#E8D5B0" />
    <line x1={0} y1={1020} x2={704} y2={1020} stroke={INK} strokeWidth={4} />
    {/* stall counter */}
    <rect x={40} y={880} width={624} height={140} rx={10} fill="#B07B4F" stroke={INK} strokeWidth={5} />
    <rect x={60} y={1020} width={22} height={90} fill={INK} />
    <rect x={622} y={1020} width={22} height={90} fill={INK} />
    {/* kettle with rising steam */}
    <g transform="translate(150 830)">
      <ellipse cx={0} cy={0} rx={44} ry={34} fill="#8A8A8A" stroke={INK} strokeWidth={4} />
      <rect x={-14} y={-46} width={28} height={16} rx={5} fill="#8A8A8A" stroke={INK} strokeWidth={4} />
      <path d="M 40 -6 Q 66 -10 58 16" stroke={INK} strokeWidth={5} fill="none" />
      {[0, 1, 2].map(i => {
        const t = ((frame + i * 22) % 66) / 66;
        return <circle key={i} cx={0} cy={-58 - t * 80} r={7 + t * 9} fill="#fff" opacity={0.75 * (1 - t)} />;
      })}
    </g>
    {/* hanging cups */}
    {[330, 420, 510].map((cx, i) => (
      <g key={i} transform={`translate(${cx} ${840 + Math.sin(frame / 16 + i) * 3})`}>
        <line x1={0} y1={-60} x2={0} y2={0} stroke={INK} strokeWidth={3} />
        <path d="M -20 0 h 40 l -6 26 h -28 Z" fill="#fff" stroke={INK} strokeWidth={4} />
      </g>
    ))}
    {/* signboard — M3: width sized from measured text, never fixed */}
    {(() => {
      // DYNAMIC law: signboard label comes from beat data, never hardcoded
      const label = (typeof window !== 'undefined' && (window as any).__scene_label) || 'DAILY HABIT CHECK';
      // Arial bold 30px in SVG viewBox units: ~0.62em average advance
      const w = Math.ceil(label.length * 30 * 0.62) + 56; // + padding
      return (
        <g>
          <rect x={352 - w / 2} y={120} width={w} height={64} rx={10} fill={RED} stroke={INK} strokeWidth={5} />
          <text x={352} y={162} textAnchor="middle" fontSize={30} fontWeight={900} fill="#fff" fontFamily="Arial">{label}</text>
        </g>
      );
    })()}
  </g>
);

const CityPark: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <SkyGrad top="#E8F4FD" bottom="#D3EAF8" />
    {/* sun */}
    <circle cx={110} cy={130} r={50} fill="#F6C445" opacity={0.9} />
    {/* clouds */}
    {[0, 1].map(i => {
      const x = (frame * 0.25 + i * 380) % 900 - 100;
      return (
        <g key={i} transform={`translate(${x} ${110 + i * 70})`} opacity={0.9}>
          <ellipse cx={0} cy={0} rx={52} ry={22} fill="#fff" />
          <ellipse cx={38} cy={-8} rx={36} ry={18} fill="#fff" />
        </g>
      );
    })}
    {/* ground */}
    <rect y={1040} width={704} height={240} fill="#A8D5A2" />
    <line x1={0} y1={1040} x2={704} y2={1040} stroke={INK} strokeWidth={4} />
    {/* trees */}
    {[90, 610].map((x, i) => (
      <g key={i} transform={`translate(${x} 0)`}>
        <rect x={-10} y={860} width={20} height={190} fill="#8B5E3C" stroke={INK} strokeWidth={4} />
        <circle cx={0} cy={820} r={78} fill={GREEN} stroke={INK} strokeWidth={5} />
        <circle cx={-48} cy={880} r={48} fill={GREEN} stroke={INK} strokeWidth={4} />
        <circle cx={48} cy={880} r={48} fill={GREEN} stroke={INK} strokeWidth={4} />
      </g>
    ))}
    {/* bench */}
    <g transform="translate(352 1090)">
      <rect x={-90} y={0} width={180} height={16} rx={6} fill="#B07B4F" stroke={INK} strokeWidth={4} />
      <rect x={-78} y={16} width={14} height={40} fill={INK} />
      <rect x={64} y={16} width={14} height={40} fill={INK} />
    </g>
    {/* birds */}
    {[0, 1, 2].map(i => {
      const t = (frame * 0.9 + i * 130) % 900;
      const bx = t - 100, by = 190 + Math.sin((frame + i * 40) / 20) * 16;
      return <path key={i} d={`M ${bx} ${by} q 9 -9 18 0 q 9 -9 18 0`} stroke={INK} strokeWidth={3.5} fill="none" />;
    })}
  </g>
);

const HomeDesk: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <SkyGrad top="#FDF1EC" bottom="#F3DED4" />
    {/* wall + floor */}
    <rect y={980} width={704} height={300} fill="#D9B08C" />
    <line x1={0} y1={980} x2={704} y2={980} stroke={INK} strokeWidth={4} />
    {/* window w/ day sky */}
    <g>
      <rect x={60} y={150} width={220} height={300} rx={8} fill="#BEE3F8" stroke={INK} strokeWidth={6} />
      <line x1={170} y1={150} x2={170} y2={450} stroke={INK} strokeWidth={5} />
      <line x1={60} y1={300} x2={280} y2={300} stroke={INK} strokeWidth={5} />
      <circle cx={112} cy={212} r={26} fill="#F6C445" />
      <circle cx={236} cy={252} r={16} fill="#fff" opacity={0.9} />
    </g>
    {/* wall clock — moved to (620 330): out of the hook-badge band
        (M4: badge y170-228 overlapped clock y166-274) */}
    <g transform="translate(620 330)">
      <circle cx={0} cy={0} r={54} fill="#fff" stroke={INK} strokeWidth={6} />
      <line x1={0} y1={0} x2={0} y2={-34} stroke={INK} strokeWidth={5} strokeLinecap="round" transform={`rotate(${(frame / 10) % 360})`} />
      <line x1={0} y1={0} x2={22} y2={12} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    </g>
    {/* shelf with plant */}
    <g transform="translate(430 480)">
      <rect x={-90} y={0} width={180} height={14} rx={4} fill="#B07B4F" stroke={INK} strokeWidth={4} />
      <rect x={-26} y={-56} width={52} height={56} rx={6} fill={RED} stroke={INK} strokeWidth={4} />
      <path d={`M 0 -56 Q -30 ${-96 + Math.sin(frame / 18) * 4} -12 -110 Q 8 -96 2 -70 Q 26 -100 30 -64`} fill={GREEN} stroke={INK} strokeWidth={3} />
    </g>
    {/* desk */}
    <rect x={100} y={1020} width={504} height={26} rx={8} fill="#B07B4F" stroke={INK} strokeWidth={5} />
    <rect x={130} y={1046} width={20} height={110} fill={INK} />
    <rect x={554} y={1046} width={20} height={110} fill={INK} />
    {/* piggy bank w/ coin slot (moved off listener position x=556 -> 348) */}
    <g transform="translate(348 988)">
      <ellipse cx={0} cy={0} rx={42} ry={30} fill="#F6A1B5" stroke={INK} strokeWidth={4} />
      <rect x={-16} y={-28} width={32} height={7} rx={3} fill={INK} />
      <circle cx={26} cy={-6} r={5} fill={INK} />
    </g>
  </g>
);

const TradingFloor: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <SkyGrad top="#E4ECF5" bottom="#C9D8E8" />
    <rect y={1000} width={704} height={280} fill="#9FB2C4" />
    <line x1={0} y1={1000} x2={704} y2={1000} stroke={INK} strokeWidth={4} />
    {/* big board — compressed above the speech-bubble zone (bubble top = 330) */}
    <rect x={52} y={70} width={600} height={252} rx={12} fill="#101820" stroke={INK} strokeWidth={6} />
    <text x={352} y={130} textAnchor="middle" fontSize={40} fontWeight={900} fill={RED} fontFamily="Courier New, monospace">▼ NIFTY 50</text>
    <text x={352} y={196} textAnchor="middle" fontSize={48} fontWeight={900} fill="#fff" fontFamily="Courier New, monospace">23,653</text>
    <text x={352} y={252} textAnchor="middle" fontSize={30} fontWeight={800} fill={RED} fontFamily="Courier New, monospace">-4.5% FROM HIGH</text>
    {/* decorative pillars (no text — data lives on the overlay card) */}
    {[180, 352, 524].map((x, i) => (
      <g key={i} transform={`translate(${x} 0)`}>
        <rect x={-10} y={322} width={20} height={658} fill={INK} />
      </g>
    ))}
  </g>
);

const EveningRoad: React.FC<{ frame: number }> = ({ frame }) => (
  <g>
    <SkyGrad top="#3D3B63" bottom="#E8896B" />
    {[...Array(9)].map((_, i) => (
      <circle key={i} cx={60 + i * 72} cy={90 + (i % 3) * 46} r={3} fill="#fff" opacity={0.5 + 0.5 * Math.sin(frame / 20 + i)} />
    ))}
    {/* setting sun (lowered so the melting-ice visual at y~620 clears it) */}
    <circle cx={352} cy={810} r={90} fill="#F6C445" opacity={0.95} />
    {/* road */}
    <rect y={1020} width={704} height={260} fill="#4A4A52" />
    <line x1={0} y1={1020} x2={704} y2={1020} stroke={INK} strokeWidth={4} />
    {[...Array(5)].map((_, i) => (
      <rect key={i} x={40 + i * 140} y={1130} width={70} height={12} rx={6} fill="#F0E6D2" opacity={0.85} />
    ))}
    {/* streetlamp */}
    <g transform="translate(600 0)">
      <rect x={-7} y={560} width={14} height={470} fill={INK} />
      <path d="M 0 566 Q 0 520 -46 520" stroke={INK} strokeWidth={12} fill="none" strokeLinecap="round" />
      <circle cx={-52} cy={528} r={13} fill="#FFE9A8" stroke={INK} strokeWidth={4} />
      <circle cx={-52} cy={528} r={26 + Math.sin(frame / 15) * 3} fill="#FFE9A8" opacity={0.28} />
    </g>
    {/* silhouetted skyline */}
    <g fill="#2E2C4E">
      <rect x={0} y={880} width={130} height={150} />
      <rect x={130} y={930} width={90} height={100} />
      <rect x={420} y={910} width={110} height={120} />
      <rect x={530} y={860} width={80} height={170} />
    </g>
  </g>
);

export const BACKGROUNDS: Record<string, React.FC<{ frame: number }>> = {
  tea_stall: TeaStall, city_park: CityPark, home_desk: HomeDesk,
  trading_floor: TradingFloor, evening_road: EveningRoad,
};

// ---------------- Per-beat visual props ----------------
// ---------------- Phone-scroll + eye icons (AK 2026-09-15: 'no screen
// scrolling virtual and eye icon svg etc') ----------------
// Animated phone with a scrolling feed (screen-time visual)
export const PhoneScroll: React.FC<{ frame: number; x: number; y: number; scale?: number; night?: boolean }> =
  ({ frame, x, y, scale = 1, night = false }) => {
    const scroll = (frame * 3.2) % 240; // continuous slow scroll
    const body = night ? '#1A1F2E' : '#F7F5F0';
    const textBar = night ? '#3A4358' : '#D9D4C8';
    const clipId = `phoneclip${x.toFixed(0)}${y.toFixed(0)}`;
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <defs>
          <clipPath id={clipId}>
            <rect x={-52} y={-88} width={104} height={196} rx={8} />
          </clipPath>
        </defs>
        <rect x={-60} y={-120} width={120} height={240} rx={18}
          fill={night ? '#0D1117' : '#fff'} stroke={INK} strokeWidth={6} />
        <rect x={-52} y={-108} width={104} height={216} rx={10} fill={body} />
        <rect x={-40} y={-100} width={24} height={6} rx={3} fill={textBar} />
        <circle cx={36} cy={-97} r={5} fill={night ? '#F6C445' : '#8FD694'} />
        <g clipPath={`url(#${clipId})`}>
          {[0, 1, 2, 3].map(i => {
            const yy = 60 + ((i * 70 - scroll) % 280) - 140;
            return (
              <g key={i} opacity={0.9}>
                <circle cx={-30} cy={yy} r={9}
                  fill={i % 2 ? ORANGE : RED} opacity={0.75} />
                <rect x={-14} y={yy - 10} width={56} height={8} rx={4} fill={textBar} />
                <rect x={-14} y={yy + 3} width={44} height={6} rx={3} fill={textBar} opacity={0.6} />
              </g>
            );
          })}
        </g>
        <rect x={-18} y={98} width={36} height={5} rx={2.5} fill={INK} opacity={0.5} />
        {night && (
          <rect x={-52} y={-88} width={104} height={196} rx={8}
            fill='#5B8DEF' opacity={0.12 + 0.05 * Math.sin(frame / 8)} />
        )}
      </g>
    );
  };

// Eye icon: blinking; 'dry' = fast blinks, 'strain' = red + veins + pulse
export const EyeIcon: React.FC<{
  frame: number; x: number; y: number; scale?: number;
  state?: 'normal' | 'dry' | 'strain'; label?: string;
}> = ({ frame, x, y, scale = 1, state = 'normal', label }) => {
  const period = state === 'dry' ? 40 : 90;
  const t = frame % period;
  const blink = t < 6 ? 0.12 : 1;
  const S = 46;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d={`M ${-S} 0 Q 0 ${-S * 0.85} ${S} 0 Q 0 ${S * 0.85} ${-S} 0 Z`}
        fill='#fff' stroke={INK} strokeWidth={5} />
      <g opacity={blink}>
        <circle cx={0} cy={0} r={S * 0.42}
          fill={state === 'strain' ? '#E85B5B' : '#7FB3E8'} />
        <circle cx={0} cy={0} r={S * 0.18} fill={INK} />
        {state === 'strain' && [[-1, -0.3], [1, -0.25], [-0.9, 0.35], [0.85, 0.3]].map(([dx, dy], i) => (
          <path key={i}
            d={`M ${dx * S * 0.75} ${dy * S * 0.75} Q ${dx * S * 0.45} ${dy * S * 0.45 + 3} ${dx * S * 0.38} ${dy * S * 0.4}`}
            stroke={RED} strokeWidth={2.5} fill='none' opacity={0.8} />
        ))}
      </g>
      {state === 'strain' && (
        <circle cx={0} cy={0} r={S * 0.9 + (frame % 30) * 0.8}
          fill='none' stroke={RED} strokeWidth={3}
          opacity={0.5 * (1 - (frame % 30) / 30)} />
      )}
      {label && (
        <text x={0} y={S + 30} textAnchor='middle' fontSize={22}
          fontWeight={900} fill={state === 'strain' ? RED : INK}
          fontFamily='Arial'>{label}</text>
      )}
    </g>
  );
};

// ---------------- topic SVG icons (data-driven visuals) ----------------
// floaters: dark dots drifting in eye; flash: lightning bolt; curtain:
// shadow across view; blur: fading eye; clock: urgency; scan: one-eye test
const TopicIcon: React.FC<{ icon: string; frame: number }> = ({ icon, frame }) => {
  // VIRAL ICON LAW (AK 2026-09-15: "not this types of icons svg... u see
  // in internet"): rich full-color emoji glyphs (Noto Color Emoji) with
  // springy pop-in + idle wiggle — NOT flat SVG outlines.
  const EMOJI: Record<string, string> = {
    screen: '📱', laptop: '💻', bolt: '⚡', fire: '🔥', flash: '✨',
    eye: '👁️', eye_off: '😵', blur: '🥴', floaters: '👁️', curtain: '😨',
    clock: '⏰', drop: '💧', pill: '💊', sleep: '😴', sun: '☀️',
    warning: '⚠️', check: '✅', cross: '❌', target: '🎯', brain: '🧠',
    book: '📖', chart: '📊', money: '💰', heart: '❤️', doctor: '🩺',
  };
  const glyph = EMOJI[icon] || '👁️';
  const springy = 1 + 0.06 * Math.sin(frame / 6);
  const tilt = Math.sin(frame / 14) * 4;
  return (
    <g transform={`scale(${springy}) rotate(${tilt})`}>
      <text x={0} y={62} fontSize={68} fontFamily='"Noto Color Emoji", "Noto Sans", sans-serif'>{glyph}</text>
    </g>
  );
};

const BeatVisual: React.FC<{ beat: ConvoBeat; frame: number }> = ({ beat, frame }) => {
  const v = beat.visual;
  if (!v) return null;
  switch (v.kind) {
    case 'flag_list': {
      // DATA-DRIVEN: topic red-flag list w/ SVG icons per item. Icons
      // animate (pop-in staggered), text from beat data — never hardcoded.
      const items = (v as any).items || [];
      const title = (v as any).title || 'RED FLAGS';
      return (
        <g>
          <Card frame={frame} x={62} y={400} w={580} h={100 + items.length * 105}>
            <text x={290} y={52} textAnchor="middle" fontSize={34} fontWeight={900} fill={RED} fontFamily="Arial">{title}</text>
            {items.map((it: any, i: number) => {
              const p = interpolate(frame, [10 + i * 12, 22 + i * 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              const y = 105 + i * 105;
              return (
                <g key={i} transform={`translate(40 ${y}) scale(${p})`}>
                  <TopicIcon icon={it.icon} frame={frame} />
                  <text x={92} y={34} fontSize={30} fontWeight={800} fill={INK} fontFamily="Arial">{it.text}</text>
                </g>
              );
            })}
          </Card>
        </g>
      );
    }
    case 'stat_pair': {
      // DATA-DRIVEN: two-stat comparison card. Accepts items[] OR
      // left/right shape {left:{label,value}, right:{label,value}}.
      const items = (v as any).items || [
        (v as any).left, (v as any).right,
      ].filter(Boolean);
      return (
        <g>
          <Card frame={frame} x={72} y={440} w={560} h={190}>
            {items.map((it: any, i: number) => (
              <React.Fragment key={i}>
                <BigStat label={it.label} value={it.value} color={it.color || INK} x={44 + i * 318} y={42} />
                {i < items.length - 1 && <line x1={280 + i * 40} y1={30} x2={280 + i * 40} y2={160} stroke="#DDD" strokeWidth={3} />}
              </React.Fragment>
            ))}
          </Card>
        </g>
      );
    }
    case 'broll_shot1':
      return <Shot1Phone />;
    case 'broll_shot2':
      return <Shot2ManWindow />;
    case 'broll_lens_night':
      return <BrollLensNight />;
    case 'broll_case_morning':
      return <BrollCaseMorning />;
    case 'rule_card': {
      // DATA-DRIVEN: rule/takeaway card from beat data.
      // M1: height grows with line count — 3 lines at y162+2*26=214
      // overflowed the fixed h=200 card (3rd line clipped).
      const nLines = ((v as any).lines || []).length;
      const cardH = Math.max(200, 60 + (nLines ? 156 + (nLines - 1) * 26 : 0));
      return (
        <g>
          <Card frame={frame} x={82} y={420} w={540} h={cardH}>
            {(v as any).title && <text x={270} y={56} textAnchor="middle" fontSize={32} fontWeight={900} fill={GREEN} fontFamily="Arial">{(v as any).title}</text>}
            <text x={270} y={118} textAnchor="middle" fontSize={44} fontWeight={900} fill={INK} fontFamily="Courier New">{(v as any).rule}</text>
            {((v as any).lines || []).map((ln: string, i: number) => (
              <text key={i} x={270} y={162 + i * 26} textAnchor="middle" fontSize={24} fontWeight={700} fill="#666" fontFamily="Arial">{ln}</text>
            ))}
            {(v as any).note && <text x={270} y={168 + nLines * 26} textAnchor="middle" fontSize={24} fontWeight={700} fill="#666" fontFamily="Arial">{(v as any).note}</text>}
            {/* VIRAL ICON ROW — topic-driven from beat.visual.icons */}
            {((v as any).icons || []).length > 0 && (
              <g transform={`translate(${270 - ((v as any).icons.length - 1) * 75} ${cardH - 56})`}>
                {((v as any).icons || []).map((it: any, i: number) => {
                  const ip = interpolate(frame, [18 + i * 10, 30 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.back(2) });
                  return (
                    <g key={i} transform={`translate(${i * 110} 0) scale(${ip * 0.85})`}>
                      <TopicIcon icon={it.icon} frame={frame} />
                      <text x={34} y={86} textAnchor="middle" fontSize={17} fontWeight={800} fill={INK} fontFamily="Arial">{it.label}</text>
                    </g>
                  );
                })}
              </g>
            )}
          </Card>
        </g>
      );
    }
    case 'cta': {
      // M3: mandatory CTA end card — headline + follow line + icons.
      // Viral icon row is topic-driven (beat.visual.icons) and ANIMATED.
      return (
        <g>
          <Card frame={frame} x={42} y={430} w={620} h={395}>
            <text x={352} y={80} textAnchor="middle" fontSize={40} fontWeight={900} fill={INK} fontFamily="Arial">{(v as any).headline || 'SAVE THIS'}</text>
            <text x={352} y={136} textAnchor="middle" fontSize={20} fontWeight={700} fill={GREEN} fontFamily="Arial">{(v as any).sub || 'Follow for the science'}</text>
            <g transform="translate(352 200)">
              {/* save (bookmark) + share icons */}
              <path d="M -60 -24 L -60 24 L -42 10 L -24 24 L -24 -24 Z" fill="none" stroke={RED} strokeWidth={5} strokeLinejoin="round" />
              <circle cx={70} cy={0} r={26} fill="none" stroke={INK} strokeWidth={5} />
              <path d="M 58 -8 L 82 0 L 58 8" fill="none" stroke={INK} strokeWidth={5} strokeLinejoin="round" />
            </g>
            {((v as any).icons || []).length > 0 && (
              <g transform={`translate(${352 - ((v as any).icons.length - 1) * 75} ${250})`}>
                {((v as any).icons || []).map((it: any, i: number) => {
                  const ip = interpolate(frame, [16 + i * 9, 28 + i * 9], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.back(2) });
                  return (
                    <g key={i} transform={`translate(${i * 110} 0) scale(${ip * 0.8})`}>
                      <TopicIcon icon={it.icon} frame={frame} />
                      <text x={34} y={82} textAnchor="middle" fontSize={17} fontWeight={800} fill={INK} fontFamily="Arial">{it.label}</text>
                    </g>
                  );
                })}
              </g>
            )}
          </Card>
        </g>
      );
    }
    case 'countdown': {
      // DATA-DRIVEN urgency countdown — designed ring: 60 tick marks,
      // red progress arc that sweeps around, hazard pulse halo.
      const p = 0.5 + 0.5 * Math.sin(frame / 6);
      const sweep = 2 * Math.PI * (0.08 + 0.92 * ((frame % 90) / 90));
      const ticks = Array.from({length: 60}, (_, i) => {
        const a = (i / 60) * 2 * Math.PI - Math.PI / 2;
        const r1 = 96, r2 = i % 5 === 0 ? 108 : 104;
        return <line key={i} x1={r1 * Math.cos(a)} y1={r1 * Math.sin(a)}
                     x2={r2 * Math.cos(a)} y2={r2 * Math.sin(a)}
                     stroke={i / 60 <= ((frame % 90) / 90) ? RED : '#C9B8A8'}
                     strokeWidth={i % 5 === 0 ? 5 : 2.5} />;
      });
      return (
        <g transform="translate(352 560)">
          <circle cx={0} cy={0} r={95 + 10 * p} fill="none" stroke={RED} strokeWidth={4} opacity={0.25 + 0.3 * p} />
          <circle cx={0} cy={0} r={92} fill="#FFF" stroke={INK} strokeWidth={6} />
          <circle cx={0} cy={0} r={84} fill="none" stroke="#EEE" strokeWidth={12} />
          <path d={`M 0 -84 A 84 84 0 ${sweep > Math.PI ? 1 : 0} 1 ${84 * Math.sin(sweep)} ${-84 * Math.cos(sweep)}`}
                fill="none" stroke={RED} strokeWidth={12} strokeLinecap="round" />
          {ticks}
          <text x={0} y={12} textAnchor="middle" fontSize={54} fontWeight={900} fill={RED} fontFamily="Courier New">{(v as any).value}</text>
          <text x={0} y={52} textAnchor="middle" fontSize={22} fontWeight={700} fill="#666" fontFamily="Arial">{(v as any).sublabel || ''}</text>
          <text x={0} y={165} textAnchor="middle" fontSize={34} fontWeight={900} fill={INK} fontFamily="Arial">{(v as any).label}</text>
        </g>
      );
    }
    case 'price_tag':
      return (
        <g>
          <Card frame={frame} x={110} y={560} w={484} h={150}>
            <text x={242} y={62} textAnchor="middle" fontSize={38} fontWeight={900} fill={INK} fontFamily="Arial">₹10 → ₹14</text>
            <text x={242} y={112} textAnchor="middle" fontSize={26} fontWeight={700} fill={RED} fontFamily="Arial">+40% IN 6 YEARS</text>
          </Card>
          <PhoneScroll frame={frame} x={565} y={800} scale={0.8} />
        </g>
      );
    case 'weak_coin':
      return (
        <g transform="translate(352 640)">
          {[0, 1, 2].map(i => {
            const r = 74 - i * 22;
            const p = interpolate(frame, [14 + i * 10, 24 + i * 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            return <circle key={i} cx={0} cy={0} r={r * p} fill="none" stroke={i === 2 ? RED : ORANGE} strokeWidth={7} strokeDasharray="10 12" opacity={0.4 + i * 0.3} />;
          })}
          <text x={0} y={132} textAnchor="middle" fontSize={30} fontWeight={800} fill={RED} fontFamily="Arial">YOUR ₹ BUYS LESS</text>
        </g>
      );
    case 'stat_cards':
      return (
        <g>
          <Card frame={frame} x={72} y={540} w={560} h={190}>
            <BigStat label="NORMAL BLINK" value="15-20/min" color={GREEN} x={44} y={42} />
            <line x1={280} y1={30} x2={280} y2={160} stroke="#DDD" strokeWidth={3} />
            <BigStat label="ON SCREENS" value="6-8/min" color={RED} x={318} y={42} />
          </Card>
          <EyeIcon frame={frame} x={150} y={770} state="normal" scale={0.75} />
          <EyeIcon frame={frame} x={300} y={770} state="dry" scale={0.75} />
          <EyeIcon frame={frame} x={450} y={770} state="strain" scale={0.75} />
        </g>
      );
    case 'rule72':
      return (
        <Card frame={frame} x={82} y={540} w={540} h={190}>
          <text x={270} y={58} textAnchor="middle" fontSize={26} fontWeight={700} fill="#666" fontFamily="Arial">20-20-20 RULE</text>
          <text x={270} y={112} textAnchor="middle" fontSize={40} fontWeight={900} fill={INK} fontFamily="Courier New">20 min → 20 ft → 20 s</text>
          <text x={270} y={158} textAnchor="middle" fontSize={24} fontWeight={700} fill={GREEN} fontFamily="Arial">EYES RESET, STRAIN DROPS</text>
        </Card>
      );
    case 'real_rate':
      return (
        <Card frame={frame} x={72} y={540} w={560} h={190}>
          <BigStat label="SYMPTOM 1" value="Dry eyes" color={ORANGE} x={44} y={42} />
          <line x1={280} y1={30} x2={280} y2={160} stroke="#DDD" strokeWidth={3} />
          <BigStat label="SYMPTOM 2" value="Headaches" color={RED} x={318} y={42} />
        </Card>
      );
    case 'ticker':
      return (
        <Card frame={frame} x={72} y={540} w={560} h={170}>
          <text x={40} y={54} fontSize={24} fontWeight={800} fill="#666" fontFamily="Arial">NIFTY 50 (6 MO)</text>
          <text x={520} y={54} textAnchor="end" fontSize={30} fontWeight={900} fill={RED} fontFamily="Courier New">-4.5%</text>
          <path d="M 40 130 L 110 108 L 180 122 L 250 88 L 320 106 L 390 66 L 460 94 L 520 76" stroke={RED} strokeWidth={5} fill="none" />
          <text x={520} y={136} textAnchor="end" fontSize={22} fontWeight={700} fill={GREEN} fontFamily="Arial">LONG-TERM: UP</text>
        </Card>
      );
    case 'melting':
      return (
        <g transform="translate(352 620)">
          {(() => {
            const melt = interpolate(frame, [16, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
            const h = 110 * (1 - melt * 0.55);
            return (
              <g>
                <path d={`M -46 ${-h} L 46 ${-h} L 34 0 L -34 0 Z`} fill="#BEE3F8" stroke={BLUE} strokeWidth={5} />
                <text x={0} y={-h / 2 + 8} textAnchor="middle" fontSize={30} fontWeight={900} fill={BLUE} fontFamily="Arial">₹</text>
              </g>
            );
          })()}
          <ellipse cx={0} cy={14} rx={64} ry={12} fill="#BEE3F8" opacity={0.6} />
          <text x={0} y={72} textAnchor="middle" fontSize={28} fontWeight={800} fill={RED} fontFamily="Arial">CASH MELTS SLOWLY</text>
        </g>
      );
    case 'cta':
      return (
        <Card frame={frame} x={122} y={540} w={460} h={140} rot={1}>
          <text x={230} y={62} textAnchor="middle" fontSize={34} fontWeight={900} fill={RED} fontFamily="Arial">PROTECT YOUR EYES</text>
          <text x={230} y={110} textAnchor="middle" fontSize={24} fontWeight={700} fill={INK} fontFamily="Arial">FOLLOW FOR THE SCIENCE</text>
        </Card>
      );
    default:
      return null;
  }
};

// A3: persistent disclaimer (from frame 0) ----------------
// I4 + defect fix: captions occupy the bottom band, so the disclaimer moves
// to the TOP 8% band where nothing else renders and platform UI never covers.
export const DisclaimerTag: React.FC = () => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 12], [0, 0.9], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: '50%', top: '7.5%', transform: 'translateX(-50%)',
      background: 'rgba(0,0,0,0.62)', color: '#EAEAEA', borderRadius: 999,
      padding: '6px 20px', fontSize: 24, fontWeight: 600, opacity: fade,
      whiteSpace: 'nowrap', fontFamily: 'Arial, sans-serif', zIndex: 50,
    }}>
      Education only — not medical advice
    </div>
  );
};

// ---------------- A1: word-level burned-in captions ----------------
// Word highlight driven by scene-local frame; per-word duration = beat frames
// / word count. Hook/PAYOFF words get accent colour.
const CAPTION_ACCENT = new Set(['BURNING', 'SIXTY', '20-20-20:', 'DAMAGE', 'WARNING', 'STOP']);
export const WordCaptions: React.FC<{ text: string; frames: number; frame: number }> =
({ text, frames, frame }) => {
  const words = text.split(/\s+/);
  const per = frames / Math.max(1, words.length);
  const active = Math.min(words.length - 1, Math.floor(frame / per));
  // Defect fix: long VO texts stacked 7+ caption lines over the stat card.
  // Show a 6-word sliding window centred on the active word instead.
  const WIN = 4;
  const start = Math.max(0, Math.min(active - 2, words.length - WIN));
  const slice = words.slice(start, start + WIN);
  // 3+ rows collide with the character row (measured 26s defect) —
  // shrink font as window grows, keep max 2 rows visually
  const fs = slice.length >= 6 ? 44 : 52;
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: '25%', transform: 'translateX(-50%)',
      display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
      maxWidth: '86%', fontFamily: 'Arial, sans-serif', zIndex: 40,
    }}>
      {slice.map((w, i) => {
        const gi = start + i;
        return (
        <span key={i} style={{
          fontSize: fs, fontWeight: 900, color: gi === active ? '#FF3B30' : '#fff',
          background: 'rgba(0,0,0,0.72)', borderRadius: 10, padding: '6px 16px',
          textTransform: 'uppercase' as const,
        }}>{w}</span>
        );
      })}
    </div>
  );
};

// ---------------- Main composition ----------------
export const XiaoheiConvo: React.FC = () => {
  const data: ConvoData = (globalThis as any).__CONVO__;
  // M2 audit note: the old single-frame find() kept a stale bubble mounted when
  // `frame` landed exactly on a boundary beat (floating-point/`>=` edge) — the
  // previous beat's <Bubble> was never unmounted because both beats matched the
  // same render pass. Replace with <Sequence> per scene: Remotion unmounts the
  // previous Sequence automatically at its boundary (from + durationInFrames).
  const total = data.beats.reduce((a, b) => a + b.frames, 0);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {data.beats.map((b) => (
        <Sequence key={b.id} from={b.start} durationInFrames={b.frames}
                  layout="absolute-fill">
          <SceneScene beat={b} data={data} />
        </Sequence>
      ))}
      {/* A3: persistent disclaimer from frame 0 — NOT part of any scene */}
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <DisclaimerTag />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const SceneScene: React.FC<{ beat: any; data: ConvoData }> = ({ beat, data }) => {
  const frame = useCurrentFrame(); // scene-local frame inside the Sequence
  const lf = frame;
  const bg = BACKGROUNDS[beat.scene] || TeaStall;
  // DYNAMIC law: feed the background signboard label from beat data
  if (typeof window !== 'undefined') {
    (window as any).__scene_label = beat.scene_label || 'DAILY HABIT CHECK';
  }
  // B-ROLL LAW (AK 2026-09-15): broll_* kinds are FULL-FRAME cinematic
  // scenes — they REPLACE the character scene entirely (skip scene svg,
  // characters, bubbles). Captions + disclaimer still overlay on top.
  if ((beat.visual?.kind || '').startsWith('broll_')) {
    return (
      <AbsoluteFill>
        <BeatVisual beat={beat} frame={lf} />
        <WordAnchoredCaptions frame={(beat.start ?? 0) + lf} />
        {!((globalThis as any).__CONVO__?.captions?.length) && (
          <WordCaptions text={beat.voText ?? ''} frames={beat.frames} frame={lf} />
        )}
      </AbsoluteFill>
    );
  }
  const meta = SPEAKER_META[beat.speaker];
  const listener = beat.speaker === 'RAVI' ? 'VIKRAM' : 'RAVI';
  const lmeta = SPEAKER_META[listener];
  const isLeft = meta.side === 'left';

  // camera: center-based push-in with slight bias toward the speaker.
  // Anchor at frame center so the scene always fills the 1080x1920 frame.
  const zoom = interpolate(lf, [0, beat.frames], [1.0, 1.05], { extrapolateRight: 'clamp' });
  const camX = isLeft ? 26 : -26;
  // PATTERN INTERRUPT (5-second rule, researched 2026-09): beats > 5s get a
  // punch-in pulse at 60% — quick 1.04→1.12→1.05 zoom resets attention.
  // V2 interruptScheduler: punch EVERY beat >= 3s at its midpoint
  // (spec: visual state change <= 2.5s; v8 QC caught only 3 hard cuts).
  const long = beat.frames >= 90;
  const punch = long
    ? interpolate(lf, [beat.frames * 0.46, beat.frames * 0.52, beat.frames * 0.58],
        [0, 0.075, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;
  const zoom2 = zoom + punch;

  // TEXT HOOK (SocialMediaExaminer 2026: most underutilized hook) — a top
  // kicker that is NOT the spoken line; subtext reframes the scene.
  const hook = beat.text_hook;
  const hookP = interpolate(lf, [6, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const globalFrame = (beat.start ?? 0) + lf;
  return (
    <AbsoluteFill>
      {/* scene layer MUST be inside an <svg> — raw g/rect inside a div do not render */}
      <svg width={1080} height={1920} viewBox="0 0 704 1280" style={{ position: 'absolute', inset: 0 }}>
        <g transform={`translate(${352 + camX} 700) scale(${zoom2}) translate(-352 -700)`}>
          {React.createElement(bg, { frame })}
          {/* listener: opposite side, smaller, slightly dimmed */}
          <g transform={`translate(${isLeft ? 556 : 148} 1030)`} opacity={0.95}>
            <Xiaohei frame={frame + beat.id * 13} scale={0.82} flip={!isLeft} talking={false}
              accent={lmeta.accent} accentColor={lmeta.color} opacity={0.92} />
          </g>
          {/* speaker: active side, talking */}
          <g transform={`translate(${isLeft ? 200 : 504} 1040)`}>
            <Xiaohei frame={frame} scale={1.0} flip={isLeft} talking
              accent={meta.accent} accentColor={meta.color} />
          </g>
        {hook && (
          <g opacity={hookP}>
            <rect x={112} y={170} width={480} height={58} rx={12} fill="#1A202C" opacity={0.92} />
            <text x={352} y={208} textAnchor="middle" fontSize={27} fontWeight={900}
              fill="#F6E05E" fontFamily="Arial">{hook}</text>
          </g>
        )}
        </g>
      </svg>
      {/* bubble + visual overlay (not camera-locked) */}
      <svg width={1080} height={1920} viewBox="0 0 704 1280" style={{ position: 'absolute', inset: 0 }}>
        {beat.bubble?.length > 0 && (
        <Bubble lines={beat.bubble} x={isLeft ? 88 : 704 - 88 - 480} y={330}
          tailX={isLeft ? 130 : 350} color={meta.color} name={beat.speaker} frame={lf} width={480} />
        )}
        <BeatVisual beat={beat} frame={lf} />
      </svg>
      {/* word-anchored captions: real VO timestamps when present,
          estimate-based fallback otherwise */}
      <WordAnchoredCaptions frame={globalFrame} />
      {!((globalThis as any).__CONVO__?.captions?.length) && (
        <WordCaptions text={beat.voText ?? beat.bubble.join(' ')} frames={beat.frames} frame={lf} />
      )}
    </AbsoluteFill>
  );
};
