import { useState, useCallback } from 'react';
import { getMissionLevel } from '../config/missions';
import type { GameMode } from '../types';

interface MissionBriefingProps {
  level: number;
  gameMode: GameMode;
  onStart: (teamSize?: number) => void;
  onBack: () => void;
}

const TEAM_SIZES = [2, 3, 4, 5];

const LEVEL_ACCENT = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444'];

function MissionBriefing({ level, gameMode, onStart, onBack }: MissionBriefingProps) {
  const mission = getMissionLevel(level);
  const accent = LEVEL_ACCENT[mission.level - 1] ?? '#0ea5e9';
  const [teamSize, setTeamSize] = useState(3);

  const isTeam = gameMode === 'team';

  const handleStart = useCallback(() => {
    const playClickSound = (window as any).playClickSound;
    if (playClickSound) playClickSound();
    onStart(isTeam ? teamSize : undefined);
  }, [isTeam, teamSize, onStart]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8">
      <div className="relative z-10 max-w-2xl w-full">
        <div className="rounded-2xl border bg-gray-900/70 backdrop-blur-md overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)]" style={{ borderColor: `${accent}33` }}>
          {/* Mission header strip */}
          <div className="px-8 pt-8 pb-6 text-center border-b" style={{ borderColor: `${accent}22`, background: `linear-gradient(160deg, ${accent}14, transparent 60%)` }}>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border" style={{ background: `${accent}1c`, borderColor: `${accent}55` }}>
              <span className="text-2xl font-semibold" style={{ color: accent }}>{mission.level}</span>
            </div>
            <p className="text-[11px] font-semibold tracking-[0.28em] uppercase mb-2" style={{ color: accent }}>
              Mission {mission.level} · {mission.difficulty}
            </p>
            <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">{mission.title}</h1>
            <p className="text-sm text-gray-300 mb-1">{mission.subtitle}</p>
            <p className="text-gray-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">{mission.description}</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: `${accent}44`, background: `${accent}10` }}>
              <span className="text-sm leading-none">{isTeam ? '👥' : '🎯'}</span>
              <span className="text-xs font-medium" style={{ color: accent }}>
                {isTeam ? 'Team Mode' : 'Solo Mode'}
              </span>
            </div>
          </div>

          <div className="p-8">
            {/* Key Objectives */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg p-4 border bg-gray-950/40" style={{ borderColor: `${accent}22` }}>
                <div className="text-sm text-gray-400 mb-1">Target Accuracy</div>
                <div className="text-2xl font-semibold" style={{ color: accent }}>90%</div>
              </div>
              <div className="rounded-lg p-4 border bg-gray-950/40" style={{ borderColor: `${accent}22` }}>
                <div className="text-sm text-gray-400 mb-1">Session Length</div>
                <div className="text-2xl font-semibold text-white">{mission.duration / 60} min</div>
              </div>
              <div className="rounded-lg p-4 border bg-gray-950/40" style={{ borderColor: `${accent}22` }}>
                <div className="text-sm text-gray-400 mb-1">AI Problems</div>
                <div className="text-2xl font-semibold text-white">{mission.problems.length}</div>
              </div>
            </div>

            {/* Mission-specific guidance */}
            <div className="mb-6 rounded-lg border bg-gray-950/40 p-4" style={{ borderColor: `${accent}22` }}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" fill="none" stroke={accent} viewBox="0 0 24 24" style={{ color: accent }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>Briefing Note</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{isTeam ? mission.team_guide : mission.solo_guide}</p>
            </div>

            {/* Core loop */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Core loop</h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0" style={{ background: `${accent}1c`, color: accent }}>1</span>
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-white">Select a pipeline problem.</span> Each problem shows its threat level and the accuracy it can contribute.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0" style={{ background: `${accent}1c`, color: accent }}>2</span>
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-white">Choose a solution card.</span> Preview its energy cost, time cost, risk, and expected impact before committing.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shrink-0" style={{ background: `${accent}1c`, color: accent }}>3</span>
                  <span className="text-sm text-gray-300">
                    <span className="font-medium text-white">Apply the solution.</span> A correct match solves the problem and boosts accuracy; a mismatch costs energy. Skipped problems can be revisited at any time.
                  </span>
                </li>
              </ol>
            </div>

            {/* Team settings */}
            {isTeam && (
              <div className="mb-6 rounded-lg border bg-gray-950/40 p-4" style={{ borderColor: `${accent}22` }}>
                <div className="text-sm font-medium text-white mb-1">Team Size</div>
                <div className="text-xs text-gray-500 mb-3">Every decision is tagged with your role and reviewed as a team decision.</div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 shrink-0">Team size</span>
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setTeamSize(size)}
                      className={`w-9 h-9 rounded-lg border text-sm font-medium transition-all active:scale-95 ${
                        teamSize === size ? 'text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                      style={teamSize === size ? { background: `${accent}22`, borderColor: `${accent}66`, color: accent } : undefined}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <button onClick={onBack} className="btn-ghost px-5 py-2.5 text-sm">
                Back
              </button>
              <button
                onClick={handleStart}
                className="btn-primary px-8 py-3 flex items-center gap-2"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, boxShadow: `0 4px 20px ${accent}33` }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Begin Training
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MissionBriefing;
