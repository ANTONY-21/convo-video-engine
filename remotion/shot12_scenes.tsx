import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from 'remotion';

const INK = '#1A202C';

// SHOT 1: phone scrolling close-up — dark room, big phone, scrolling feed
export const Shot1Phone: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + f * 0.0022; // slow push-in
  const scroll = (f * 14) % 600; // feed scroll speed
  const posts = [0, 1, 2, 3, 4].map(i => ({
    y: i * 150 - scroll,
    h: 110, w: 96,
    lines: 2 + (i % 2),
  })).filter(p => p.y > -140 && p.y < 220);
  return (
    <AbsoluteFill style={{ backgroundColor: '#241B2F', justifyContent: 'center', alignItems: 'center' }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ transform: `scale(${push})` }}>
        {/* dim room glow */}
        <circle cx={540} cy={960} r={520} fill="#3B2D4F" opacity={0.5} />
        {/* hand holding phone */}
        <ellipse cx={540} cy={1780} rx={420} ry={300} fill="#C68642" opacity={0.95} />
        <ellipse cx={300} cy={1560} rx={90} ry={140} fill="#D89A5B" transform="rotate(-25 300 1560)" />
        {/* phone */}
        <rect x={330} y={520} width={420} height={880} rx={44} fill={INK} />
        <rect x={352} y={548} width={376} height={810} rx={28} fill="#10131A" />
        {/* glowing feed */}
        <g clipPath="url(#screenclip)">
          <defs><clipPath id="screenclip"><rect x={352} y={548} width={376} height={810} rx={28} /></clipPath></defs>
          {posts.map((p, i) => (
            <g key={i} transform={`translate(376 ${570 + p.y})`}>
              <rect width={328} height={p.h} rx={12} fill={i % 2 ? '#1E2633' : '#232B3B'} />
              <circle cx={26} cy={22} r={12} fill="#4FC3F7" />
              <rect x={48} y={12} width={120} height={10} rx={5} fill="#5A6B85" />
              {Array.from({ length: p.lines }, (_, l) => (
                <rect key={l} x={14} y={46 + l * 22} width={p.h > 100 ? 240 - l * 40 : 180} height={9} rx={4} fill="#44536B" />
              ))}
            </g>
          ))}
          {/* blue light glow from screen */}
          <rect x={352} y={548} width={376} height={810} fill="#7FD4FF" opacity={0.10 + 0.04 * Math.sin(f / 5)} />
        </g>
        {/* scrolling thumb */}
        <ellipse cx={560} cy={1180 + Math.sin(f / 4) * 26} rx={56} ry={92} fill="#D89A5B" />
        {/* caption chip */}
        <g opacity={interpolate(f, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <rect x={280} y={300} width={520} height={72} rx={36} fill="rgba(0,0,0,0.65)" />
          <text x={540} y={348} textAnchor="middle" fontSize={38} fontWeight={900} fill="#FF6B6B" fontFamily="Arial" letterSpacing={2}>SCROLLING NON-STOP</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// SHOT 2: man standing far away looking out the window (20 ft)
export const Shot2ManWindow: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + f * 0.0028; // slow push-in toward him
  const blink = (f % 40) > 37;
  return (
    <AbsoluteFill style={{ backgroundColor: '#FDF6EC' }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ transform: `scale(${push})` }}>
        {/* room wall */}
        <rect x={0} y={0} width={1080} height={1400} fill="#F4E8D6" />
        <rect x={0} y={1400} width={1080} height={520} fill="#C9A876" />
        {/* BIG window with daylight */}
        <rect x={120} y={140} width={840} height={760} rx={12} fill="#BEE3F8" stroke={INK} strokeWidth={10} />
        <line x1={540} y1={140} x2={540} y2={900} stroke={INK} strokeWidth={8} />
        <line x1={120} y1={520} x2={960} y2={520} stroke={INK} strokeWidth={8} />
        {/* sun + hills outside */}
        <circle cx={230} cy={260} r={56} fill="#F6E05E" />
        <path d="M 120 820 Q 340 700 540 820 T 960 800 L 960 900 L 120 900 Z" fill="#9AE6B4" opacity={0.8} />
        {/* light shaft from window */}
        <polygon points="200,900 880,900 1000,1400 80,1400" fill="#FFF8E1" opacity={0.55} />
        {/* MAN — far away, small, standing facing window (back view) */}
        <g transform="translate(540 1080) scale(1.15)">
          {/* body */}
          <ellipse cx={0} cy={0} rx={64} ry={120} fill={INK} />
          {/* head */}
          <circle cx={0} cy={-150} r={54} fill={INK} />
          {/* he blinks (eyes visible from side-back, simplified) */}
          {!blink && <circle cx={-16} cy={-158} r={6} fill="#fff" />}
          {/* relaxed arms */}
          <ellipse cx={-58} cy={-20} rx={16} ry={70} fill={INK} transform="rotate(8 -58 -20)" />
          <ellipse cx={58} cy={-20} rx={16} ry={70} fill={INK} transform="rotate(-8 58 -20)" />
          {/* legs */}
          <rect x={-38} y={110} width={26} height={130} fill={INK} />
          <rect x={12} y={110} width={26} height={130} fill={INK} />
          {/* subtle breathing */}
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 -6; 0 0" dur="3s" repeatCount="indefinite" additive="sum" />
        </g>
        {/* distance marker (20 ft) */}
        <g opacity={interpolate(f, [30, 44], [0, 0.9], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <line x1={80} y1={1560} x2={470} y2={1560} stroke={INK} strokeWidth={4} strokeDasharray="14 10" />
          <text x={90} y={1530} fontSize={30} fontWeight={900} fill={INK} fontFamily="Arial">20 FEET</text>
        </g>
        {/* caption chip */}
        <g opacity={interpolate(f, [10, 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
          <rect x={250} y={1640} width={580} height={72} rx={36} fill="rgba(0,0,0,0.65)" />
          <text x={540} y={1688} textAnchor="middle" fontSize={38} fontWeight={900} fill="#38A169" fontFamily="Arial" letterSpacing={2}>LOOK 20 FEET AWAY</text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
