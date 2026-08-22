import { memo } from 'react';
import type { ProblemInfo, SimulationState } from '../types';
import { PROBLEM_STATE_LABEL } from '../config/gameplay';
import { problemsEqual } from '../lib/stateEq';

interface ProblemDetailsProps {
  state: SimulationState;
}

function threatChip(level: number, label?: string) {
  if (level >= 5) return { label: label || 'Critical', cls: 'text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10' };
  if (level >= 4) return { label: label || 'High', cls: 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10' };
  if (level >= 3) return { label: label || 'Medium', cls: 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10' };
  return { label: label || 'Low', cls: 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10' };
}

function ProblemDetails({ state }: ProblemDetailsProps) {
  const problem: ProblemInfo | null =
    (state.problems || []).find((p) => p.id === state.current_event) ?? null;
  const stateLabel = problem ? PROBLEM_STATE_LABEL[problem.state] || PROBLEM_STATE_LABEL.UNRESOLVED : null;
  const threat = problem ? threatChip(problem.threat_level, problem.threat_label) : null;
  const recommended = problem?.recommended_solutions ?? [];

  if (!problem) {
    return (
      <div className="shrink-0 rounded-lg border border-dashed border-gray-700 bg-gray-900/40 p-2.5 text-[11px] text-gray-500">
        Select a problem from the navigator to see details and plan a solution.
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-lg border border-gray-800 bg-gray-900/50 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-semibold text-white truncate">{problem.name}</h3>
            {problem.state === 'SOLVED' && <span className="text-[#10b981] text-sm">✓</span>}
          </div>
          {stateLabel && (
            <span className={`inline-block mt-1 text-[9px] px-1.5 py-px rounded-full border font-medium ${stateLabel.cls}`}>
              {stateLabel.label}
            </span>
          )}
        </div>
        {threat && (
          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${threat.cls}`}>
            {threat.label} threat
          </span>
        )}
      </div>

      <p className="mt-1.5 text-[11px] text-gray-400 leading-snug line-clamp-2">{problem.description}</p>

      <div className="mt-2 flex items-center justify-between gap-2">
        {recommended.length > 0 && (
          <span className="text-[9px] text-gray-500 truncate min-w-0">
            Suggested: {recommended.join(', ')}
          </span>
        )}
        {problem.state !== 'SOLVED' && problem.expected_impact != null && (
          <span className="text-[10px] text-[#10b981] font-medium tabular-nums shrink-0">
            +{(problem.expected_impact * 100).toFixed(0)}% acc
          </span>
        )}
      </div>
    </div>
  );
}

export default memo(ProblemDetails, (prev, next) => problemsEqual(prev.state, next.state));
