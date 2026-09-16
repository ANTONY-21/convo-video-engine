import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const INK = '#1A202C';

// B-ROLL HOOK: dark bedroom at night, person asleep, open lens case on
// nightstand with phone glow. Topic 312 b1.
export const BrollLensNight: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + f * 0.002; // slow push-in
  // breathing chest loop (asleep)
  const breathe = Math.sin(f / 9) * 4;
  // phone glow flicker on nightstand
  const glow = 0.5 + 0.1 * Math.sin(f / 3);
  // lens case lid open shine
  const caseShine = interpolate(f, [20, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.4)) });
  return (
    <AbsoluteFill style={{ backgroundColor: '#0D1220', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ transform: `scale(${push})` }}>
        {/* moonlit window */}
        <rect x={90} y={120} width={420} height={560} rx={12} fill="#1B2A4A" stroke={INK} strokeWidth={10} />
        <line x1={300} y1={120} x2={300} y2={680} stroke={INK} strokeWidth={8} />
        <circle cx={190} cy={250} r={44} fill="#E8EEF7" />
        {/* bed */}
        <rect x={40} y={1120} width={1000} height={420} rx={28} fill="#2A3450" />
        <rect x={40} y={1040} width={1000} height={120} rx={28} fill="#38455F" />
        {/* pillow + sleeping person (back view, breathing) */}
        <ellipse cx={330} cy={1035} rx={170} ry={64} fill="#DCE6F5" />
        <g transform={`translate(640 ${1020 + breathe})`}>
          {/* blanket mound over body */}
          <ellipse cx={0} cy={90} rx={300} ry={110} fill="#4A5A7A" />
          {/* head on side */}
          <circle cx={-230} cy={20} r={62} fill="#C68642" />
          {/* closed eye line */}
          <path d={`M -262 10 q 14 10 28 0`} stroke={INK} strokeWidth={5} fill="none" />
        </g>
        {/* nightstand */}
        <rect x={620} y={1420} width={380} height={330} rx={16} fill="#5C4633" />
        <rect x={600} y={1400} width={420} height={40} rx={10} fill="#7A5C42" />
        {/* phone glow on nightstand */}
        <rect x={660} y={1320} width={70} height={80} rx={10} fill="#0F1626" stroke="#3A4A66" strokeWidth={4} />
        <rect x={666} y={1330} width={58} height={60} rx={6} fill="#7FD4FF" opacity={glow * 0.5} />
        {/* OPEN LENS CASE — the danger, pops in focus */}
        <g transform={`translate(840 1370) scale(${caseShine})`} opacity={caseShine}>
          <ellipse cx={0} cy={40} rx={78} ry={30} fill="#F6E05E" opacity={0.25} />
          {/* case base */}
          <rect x={-70} y={0} width={140} height={44} rx={20} fill="#BEE3F8" stroke={INK} strokeWidth={5} />
          <circle cx={-34} cy={18} r={20} fill="#90CDF4" stroke={INK} strokeWidth={4} />
          <circle cx={34} cy={18} r={20} fill="#90CDF4" stroke={INK} strokeWidth={4} />
          {/* lid flipped open */}
          <rect x={-70} y={-58} width={140} height={40} rx={18} fill="#90CDF4" stroke={INK} strokeWidth={5} transform="rotate(-18 0 -38)" />
        </g>
        {/* caption chip */}
        <g opacity={interpolate(f, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <rect x={270} y={320} width={540} height={72} rx={36} fill="rgba(0,0,0,0.7)" />
          <text x={540} y={368} textAnchor="middle" fontSize={38} fontWeight={900} fill="#FF6B6B" fontFamily="Arial" letterSpacing={2}>SLEEPING IN LENSES?</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// B-ROLL FIX: bright morning, hands placing lens into case with fresh
// solution, clicks shut. Topic 312 b6.
export const BrollCaseMorning: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + f * 0.0018;
  // lens drop-in animation: lens descends into cup over f 20-40
  const drop = interpolate(f, [20, 40], [-120, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.bounce) });
  // solution sparkle
  const sparkle = f % 14 < 4;
  return (
    <AbsoluteFill style={{ backgroundColor: '#FDF6EC' }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ transform: `scale(${push})` }}>
        {/* morning window light */}
        <rect x={80} y={110} width={520} height={700} rx={12} fill="#BEE3F8" stroke={INK} strokeWidth={10} />
        <line x1={340} y1={110} x2={340} y2={810} stroke={INK} strokeWidth={8} />
        <circle cx={210} cy={280} r={60} fill="#F6E05E" />
        {/* light shaft */}
        <polygon points="160,810 620,810 760,1400 60,1400" fill="#FFF8E1" opacity={0.5} />
        {/* table */}
        <rect x={0} y={1400} width={1080} height={520} fill="#C9A876" />
        <rect x={0} y={1390} width={1080} height={22} fill={INK} opacity={0.85} />
        {/* lens case (closed, safe) */}
        <g transform="translate(540 1560)">
          <ellipse cx={0} cy={90} rx={120} ry={26} fill={INK} opacity={0.15} />
          <rect x={-110} y={-10} width={220} height={90} rx={40} fill="#68D391" stroke={INK} strokeWidth={7} />
          <rect x={-110} y={-58} width={220} height={62} rx={30} fill="#9AE6B4" stroke={INK} strokeWidth={7} />
          <circle cx={-52} cy={32} r={30} fill="#C6F6D5" stroke={INK} strokeWidth={5} />
          <circle cx={52} cy={32} r={30} fill="#C6F6D5" stroke={INK} strokeWidth={5} />
          {/* lens dropping into left cup */}
          <ellipse cx={-52} cy={32 + drop} rx={22} ry={9} fill="#90CDF4" opacity={0.9} stroke={INK} strokeWidth={3} />
          {/* solution glint */}
          {sparkle && <circle cx={-30} cy={18} r={5} fill="#fff" />}
        </g>
        {/* hand (simplified flat) holding lens above */}
        <g transform={`translate(760 1180) rotate(12)`}>
          <ellipse cx={0} cy={0} rx={95} ry={130} fill="#D89A5B" />
          <ellipse cx={-60} cy={-90} rx={34} ry={54} fill="#D89A5B" transform="rotate(-20 -60 -90)" />
          {/* fingertip with lens */}
          <circle cx={-70} cy={-132} r={16} fill="#C68642" />
          <ellipse cx={-70} cy={-148} rx={14} ry={6} fill="#90CDF4" stroke={INK} strokeWidth={2} />
        </g>
        {/* caption chip */}
        <g opacity={interpolate(f, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <rect x={250} y={990} width={580} height={72} rx={36} fill="rgba(0,0,0,0.65)" />
          <text x={540} y={1038} textAnchor="middle" fontSize={38} fontWeight={900} fill="#38A169" fontFamily="Arial" letterSpacing={2}>LENSES OUT. EVERY NIGHT.</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
