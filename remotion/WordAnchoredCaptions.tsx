// ---------------- word-anchored captions (reference-video law) ----------------
// Captions driven by REAL VO word timestamps (faster-whisper on the VO
// wav) instead of frame estimates. globalThis.__CONVO__.captions =
// [{frameStart, frameEnd, beat, words: [{w, f0, f1}]}]
// Renderer shows the group whose window contains `frame` and highlights
// the word whose [f0,f1] contains it. Returns null during breath gaps.
import React from 'react';

export const WordAnchoredCaptions: React.FC<{ frame: number }> = ({ frame }) => {
  const groups =
    (globalThis as any).__CONVO__?.captions ??
    (globalThis as any).__CONVO__?.groups ??
    [];
  if (!groups || groups.length === 0) return null;
  const g = groups.find(
    (x: any) => frame >= x.frameStart && frame < x.frameEnd,
  );
  if (!g) return null; // breath gap: no caption on screen
  const active = g.words.findIndex((w: any) => frame >= w.f0 && frame < w.f1);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: '25%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
        maxWidth: '86%',
        fontFamily: 'Arial, sans-serif',
        zIndex: 40,
      }}
    >
      {g.words.map((w: any, i: number) => (
        <span
          key={i}
          style={{
            fontSize: 52,
            fontWeight: 900,
            color: i === active ? '#FF3B30' : '#fff',
            background: 'rgba(0,0,0,0.72)',
            borderRadius: 10,
            padding: '6px 16px',
            textTransform: 'uppercase' as const,
          }}
        >
          {w.w}
        </span>
      ))}
    </div>
  );
};
