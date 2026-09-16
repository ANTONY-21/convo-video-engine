import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Audio, staticFile, Sequence } from 'remotion';

export const Shot3Countdown: React.FC = () => {
  const frame = useCurrentFrame();
  const TOTAL = 150; // 5s at 30fps
  const progress = frame / TOTAL;
  const secondsLeft = Math.ceil(20 * (1 - progress));
  const ringR = 150;
  const sweep = 2 * Math.PI * (1 - progress);
  // beat pulse on each second change
  const secChanged = secondsLeft !== Math.ceil(20 * (1 - (frame - 1) / TOTAL));
  const pulse = secChanged ? 1.15 : 1;
  const ease = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.5)) });
  // tick cadence accelerates in final 5s
  const tickEvery = secondsLeft <= 5 ? 4 : 8;
  const showTick = frame % tickEvery < 2;
  return (
    <AbsoluteFill style={{ backgroundColor: '#FDF6EC', justifyContent: 'center', alignItems: 'center' }}>
      {/* tick metronome sound: alternate tik/tok each half second */}
      {Array.from({ length: 10 }, (_, i) => (
        <Sequence key={i} from={i * 15}>
          <Audio src={staticFile(i % 2 === 0 ? 'sfx/tick_tik.wav' : 'sfx/tick_tok.wav')} />
        </Sequence>
      ))}
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ transform: `scale(${ease})` }}>
        <text x={540} y={560} textAnchor="middle" fontSize={52} fontWeight={900} fill="#1A202C" fontFamily="Arial" letterSpacing={6}>EVERY 20 SECONDS</text>
        <text x={540} y={622} textAnchor="middle" fontSize={30} fontWeight={700} fill="#666" fontFamily="Arial">look 20 feet away</text>
        {/* danger ring */}
        <circle cx={540} cy={960} r={ringR + 14 + (showTick ? 6 : 0)} fill="none" stroke="#E53E3E" strokeWidth={5} opacity={showTick ? 0.9 : 0.35} />
        {/* progress ring */}
        <circle cx={540} cy={960} r={ringR} fill="none" stroke="#E2E8F0" strokeWidth={26} />
        <circle cx={540} cy={960} r={ringR} fill="none" stroke="#E53E3E" strokeWidth={26}
          strokeDasharray={`${2 * Math.PI * ringR * (1 - progress)} ${2 * Math.PI * ringR}`}
          strokeLinecap="round" transform={`rotate(-90 540 960)`} />
        {/* giant number */}
        <text x={540} y={1040} textAnchor="middle" fontSize={190} fontWeight={900}
          fill={secondsLeft <= 5 ? '#E53E3E' : '#1A202C'} fontFamily="Courier New"
          transform={`scale(${pulse})`} style={{ transformOrigin: '540px 960px' }}>{secondsLeft}</text>
        <text x={540} y={1240} textAnchor="middle" fontSize={34} fontWeight={900} fill="#38A169" fontFamily="Arial" letterSpacing={3}>SECONDS</text>
        {/* eye-away icon row */}
        <text x={470} y={1380} textAnchor="middle" fontSize={64} fontFamily='"Noto Color Emoji", sans-serif'>⏰</text>
        <text x={610} y={1380} textAnchor="middle" fontSize={64} fontFamily='"Noto Color Emoji", sans-serif'>👁️</text>
      </svg>
    </AbsoluteFill>
  );
};
