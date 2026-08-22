import { useState, useCallback } from 'react';
import type { GameMode } from '../types';

interface GameModeSelectionProps {
  onSelect: (mode: GameMode) => void;
}

const MODE_DETAILS: Record<GameMode, { title: string; description: string; icon: string; points: string[] }> = {
  solo: {
    title: 'Solo Mode',
    description: 'Make every decision yourself.',
    icon: '🎯',
    points: ['Choose any of the 7 problems freely', 'Every decision is yours', 'Best for a single focused session'],
  },
  team: {
    title: 'Team Mode',
    description: 'Work through AI decisions using different team roles.',
    icon: '👥',
    points: ['Select a role for each decision', 'Small role advantages per specialty', 'Decisions feel collaborative'],
  },
};

function GameModeSelection({ onSelect }: GameModeSelectionProps) {
  const [selected, setSelected] = useState<GameMode>('solo');

  const handleContinue = useCallback(() => {
    const playClickSound = (window as any).playClickSound;
    if (playClickSound) playClickSound();
    onSelect(selected);
  }, [selected, onSelect]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="relative z-10 w-full max-w-3xl">
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[#38bdf8] mb-3">Deployment Mode</p>
          <h1 className="text-3xl font-semibold text-white tracking-tight">Choose Your Game Mode</h1>
          <p className="text-sm text-gray-400 mt-2">Both modes run the same four-mission campaign with a 90% accuracy target per mission.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(Object.keys(MODE_DETAILS) as GameMode[]).map((mode) => {
            const detail = MODE_DETAILS[mode];
            const isSelected = selected === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  const playClickSound = (window as any).playClickSound;
                  if (playClickSound) playClickSound();
                  setSelected(mode);
                }}
                aria-pressed={isSelected}
                className={[
                  'relative text-left rounded-xl border p-5 transition-all duration-150 active:scale-[0.98]',
                  isSelected
                    ? 'border-[#0ea5e9]/70 bg-[#0ea5e9]/5 ring-1 ring-[#0ea5e9]/30'
                    : 'border-gray-700/60 bg-gray-900/60 hover:border-gray-500 hover:bg-gray-900/80',
                ].join(' ')}
              >
                {isSelected && (
                  <span className="absolute top-3 right-3 flex items-center justify-center w-5 h-5 rounded-full bg-[#0ea5e9] text-gray-900 text-xs font-bold">
                    ✓
                  </span>
                )}
                <div className="text-3xl mb-3">{detail.icon}</div>
                <h2 className="text-lg font-semibold text-white">{detail.title}</h2>
                <p className="text-sm text-gray-300 mt-1">{detail.description}</p>
                <ul className="mt-3 space-y-1">
                  {detail.points.map((point) => (
                    <li key={point} className="text-xs text-gray-500 flex items-start gap-1.5">
                      <span className="text-[#0ea5e9] mt-0.5">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mt-8">
          <button onClick={handleContinue} className="btn-primary px-8 py-3 flex items-center gap-2">
            Continue
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default GameModeSelection;
