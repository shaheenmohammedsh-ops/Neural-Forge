import { memo } from 'react';

interface Particle {
  left: number;
  size: number;
  delay: number;
  duration: number;
}

const PARTICLES: Particle[] = Array.from({ length: 12 }, (_, i) => ({
  left: (i * 83) % 100,
  size: 2 + (i % 3),
  delay: (i % 8) * 1.4,
  duration: 18 + ((i * 3) % 8) * 2,
}));

function NeuralBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 neuro-bg" />
      <div className="absolute inset-0 neuro-grid" />
      <div className="neuro-blob neuro-blob-a bg-[#0ea5e9] w-[520px] h-[520px] top-[-12%] left-[-8%]" />
      <div className="neuro-blob neuro-blob-b bg-[#7c3aed] w-[560px] h-[560px] top-[35%] right-[-12%]" />
      <div className="neuro-blob neuro-blob-c bg-[#3b82f6] w-[480px] h-[480px] bottom-[-15%] left-[28%]" />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="neuro-particle"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: 'rgba(148, 163, 184, 0.75)',
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 neuro-vignette" />
    </div>
  );
}

export default memo(NeuralBackground);
