import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';
export const EmojiTest: React.FC = () => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 8 } });
  return (
    <AbsoluteFill style={{ backgroundColor: '#FDF6EC', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ fontSize: 200, transform: `scale(${s})`, fontFamily: '"Noto Color Emoji", sans-serif' }}>👁️</div>
      <div style={{ fontSize: 120, fontFamily: '"Noto Color Emoji", sans-serif' }}>📱💻⏰🔥</div>
    </AbsoluteFill>
  );
};
