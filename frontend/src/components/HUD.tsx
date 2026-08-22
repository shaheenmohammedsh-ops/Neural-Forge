import type { SimulationState } from '../types';

interface HUDProps {
  state: SimulationState;
  lastMessage?: string | null;
  lastResult?: 'correct' | 'incorrect' | null;
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function Metric({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-gray-900/60 border border-gray-700/50 min-w-0 shrink-0">
      <span className="text-[10px] uppercase tracking-wide text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${accent || 'text-white'}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-500 hidden 2xl:inline">{sub}</span>}
    </div>
  );
}

function HUD({ state, lastMessage, lastResult }: HUDProps) {
  const timeLeft = state.time_remaining ?? 0;
  const maxTime = state.max_time ?? 180;
  const timePct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
  const target = state.current_mission?.target_accuracy ?? 0.9;
  const accTargetPct = Math.max(0, Math.min(100, (state.accuracy / target) * 100));
  const isTeam = state.game_mode === 'team' || state.team_mode;
  const solvedPct = state.total_events ? (state.events_solved / state.total_events) * 100 : 0;
  const missionTitle = state.mission_title ?? null;
  const missionLevel = state.mission_level ?? 1;

  return (
    <div className="shrink-0 relative bg-gray-950/70 backdrop-blur-sm border-b border-gray-800/80 px-3">
      <div className="flex items-center gap-1.5 h-12 overflow-x-auto slim-scroll">
        {missionTitle && (
          <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-gray-800/50 border border-gray-700/50 shrink-0">
            <span className="text-xs font-semibold text-gray-200 whitespace-nowrap">
              Lv {missionLevel} · {missionTitle}
            </span>
            {state.difficulty && <span className="text-[9px] text-gray-500 uppercase tracking-wider">{state.difficulty}</span>}
          </div>
        )}
        {isTeam ? (
          <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-[#7c3aed]/10 border border-[#7c3aed]/40 shrink-0">
            <span className="text-sm leading-none">👥</span>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold text-[#a78bfa]">TEAM</span>
              {state.active_role && <span className="text-[9px] text-gray-400">Role: {state.active_role}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 shrink-0">
            <span className="text-sm leading-none">🎯</span>
            <span className="text-xs font-semibold text-[#38bdf8]">SOLO</span>
          </div>
        )}

        <Metric label="Accuracy" value={`${(state.accuracy * 100).toFixed(1)}%`} accent="text-[#38bdf8]" sub={`target ${(target * 100).toFixed(0)}%`} />
        <Metric label="Energy" value={`${Math.round(state.neural_energy)}`} accent="text-[#f59e0b]" sub="/200" />
        <Metric label="Brain" value={`${Math.round(state.brain_health ?? 0)}%`} accent="text-[#10b981]" />
        <Metric
          label="Time"
          value={formatTime(timeLeft)}
          accent={timeLeft < 30 ? 'text-[#ef4444]' : 'text-white'}
          sub={`/ ${formatTime(maxTime)}`}
        />
        <Metric label="Score" value={`${state.score}`} accent="text-[#a78bfa]" />
        <Metric label="Solved" value={`${state.events_solved}/${state.total_events}`} accent="text-[#10b981]" sub={`${solvedPct.toFixed(0)}%`} />

        <div className="ml-2 flex-1 min-w-[120px] max-w-[240px] flex flex-col gap-0.5 shrink">
          <div className="flex items-center justify-between text-[9px] text-gray-500">
            <span>Target progress</span>
            <span className="tabular-nums">{accTargetPct.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${accTargetPct}%`,
                background: state.accuracy >= target ? '#10b981' : 'linear-gradient(90deg,#0ea5e9,#3b82f6)',
              }}
            />
          </div>
        </div>

        {lastMessage && (
          <span
            className={`text-[11px] font-medium px-2 shrink-0 whitespace-nowrap ${
              lastResult === 'correct' ? 'text-[#10b981]' : lastResult === 'incorrect' ? 'text-[#ef4444]' : 'text-gray-400'
            }`}
          >
            {lastMessage}
          </span>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-800/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] transition-all duration-1000"
          style={{ width: `${timePct}%` }}
        />
      </div>
    </div>
  );
}

export default HUD;
