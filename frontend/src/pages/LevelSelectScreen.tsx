import { useEffect, useState, useCallback } from 'react';
import { MISSION_LEVELS } from '../config/missions';
import { api } from '../services/api';
import type { GameMode, LevelProgress } from '../types';

interface LevelSelectScreenProps {
  participantId: string;
  gameMode: GameMode;
  onSelectLevel: (level: number) => void;
  onBack: () => void;
}

const LEVEL_ACCENT = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444'];
const LEVEL_DOT = ['#38bdf8', '#a78bfa', '#fbbf24', '#f87171'];

function LevelSelectScreen({ participantId, gameMode, onSelectLevel, onBack }: LevelSelectScreenProps) {
  const [progress, setProgress] = useState<LevelProgress[]>([]);

  // Progress is purely informational and never gates access. Fetch it in the
  // background so the mission cards render instantly.
  useEffect(() => {
    let cancelled = false;
    api
      .getProgress(participantId, gameMode)
      .then((res) => {
        if (!cancelled) setProgress(res.levels || []);
      })
      .catch(() => {
        /* informational only - ignore failures */
      });
    return () => {
      cancelled = true;
    };
  }, [participantId, gameMode]);

  const handlePlay = useCallback(
    (level: number) => {
      const playClickSound = (window as any).playClickSound;
      if (playClickSound) playClickSound();
      onSelectLevel(level);
    },
    [onSelectLevel]
  );

  const statusFor = (level: number): LevelProgress | undefined =>
    progress.find((p) => p.level === level);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-10">
      <div className="relative z-10 w-full max-w-5xl">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[#38bdf8] mb-3">
            {gameMode === 'team' ? 'Team Deployment' : 'Solo Deployment'}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">
            Select a Mission
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            All four missions are open. Each targets 90% accuracy with its own set of
            AI pipeline problems.
          </p>
        </div>

        {/* Mission cards - every mission is playable */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MISSION_LEVELS.map((mission, idx) => {
            const accent = LEVEL_ACCENT[idx];
            const dot = LEVEL_DOT[idx];
            const info = statusFor(mission.level);
            const best = info?.best_accuracy ?? 0;
            const attempts = info?.attempts ?? 0;
            const completed = info?.status === 'completed';

            return (
              <button
                key={mission.level}
                onClick={() => handlePlay(mission.level)}
                className={[
                  'group relative text-left rounded-2xl border p-5 flex flex-col min-h-[300px] overflow-hidden',
                  'transition-transform duration-200 ease-out hover:-translate-y-1 active:scale-[0.98]',
                  'border-gray-700/60 bg-gray-900/60 backdrop-blur-sm',
                  'hover:border-gray-400/70 hover:bg-gray-900/80',
                ].join(' ')}
              >
                {/* Accent glow */}
                <div
                  className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full blur-3xl opacity-20 transition-opacity duration-200 group-hover:opacity-35"
                  style={{ background: accent }}
                />
                {/* Top hairline */}
                <div
                  className="pointer-events-none absolute top-0 left-0 right-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}99, transparent)` }}
                />

                <div className="relative flex flex-col flex-1">
                  {/* Top row: number + status chip */}
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="flex items-center justify-center w-10 h-10 rounded-xl text-lg font-semibold"
                      style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
                    >
                      {mission.level}
                    </span>
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={
                        completed
                          ? { background: '#10b98122', color: '#10b981', border: '1px solid #10b98155' }
                          : { background: `${accent}22`, color: accent, border: `1px solid ${accent}55` }
                      }
                    >
                      {completed ? 'Best Played' : 'Open'}
                    </span>
                  </div>

                  {/* Mission identity */}
                  <h2 className="text-lg font-semibold text-white tracking-tight mb-1">{mission.title}</h2>
                  <p className="text-xs font-medium" style={{ color: dot }}>{mission.subtitle}</p>
                  <p className="text-xs text-gray-400 mt-3 leading-relaxed flex-1">{mission.description}</p>

                  {/* Difficulty */}
                  <div className="mt-4 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-gray-300">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: dot, boxShadow: `0 0 6px ${dot}` }}
                      />
                      {mission.difficulty}
                    </span>
                  </div>

                  {/* Progress info (informational) */}
                  {attempts > 0 && (
                    <p className="mt-2 text-[10px] text-gray-500">
                      Best{' '}
                      <span className="font-semibold" style={{ color: best >= 0.9 ? '#10b981' : dot }}>
                        {Math.round(best * 100)}%
                      </span>{' '}
                      · {attempts} {attempts === 1 ? 'try' : 'tries'}
                    </p>
                  )}

                  {/* Play action */}
                  <div className="mt-4 pt-3 border-t border-gray-800/80">
                    <span
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 group-hover:gap-2.5"
                      style={{
                        background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                        color: '#0a0e1a',
                        boxShadow: `0 2px 14px ${accent}33`,
                      }}
                    >
                      Play Mission
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={onBack} className="btn-ghost px-5 py-2.5 text-sm">
            Back
          </button>
          <p className="text-[10px] text-gray-600 tracking-wide">
            Four-mission campaign · Every mission is immediately playable in {gameMode === 'team' ? 'Team' : 'Solo'} Mode
          </p>
        </div>
      </div>
    </div>
  );
}

export default LevelSelectScreen;
