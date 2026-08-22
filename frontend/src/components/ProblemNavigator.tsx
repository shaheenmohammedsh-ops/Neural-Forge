import { useState, memo } from 'react';
import type { SimulationState } from '../types';
import { PROBLEM_STATE_LABEL } from '../config/gameplay';
import { problemsEqual } from '../lib/stateEq';

interface ProblemNavigatorProps {
  state: SimulationState;
  selectedRole: string;
  onSelect: (problemId: string, role: string) => void;
  onApply: (actionType: string, problemId: string, role: string) => void;
  disabled?: boolean;
}

function threatColor(level: number): string {
  if (level >= 4) return 'text-[#ef4444]';
  if (level >= 3) return 'text-[#f59e0b]';
  return 'text-[#10b981]';
}

function threatDot(level: number): string {
  if (level >= 4) return 'bg-[#ef4444]';
  if (level >= 3) return 'bg-[#f59e0b]';
  return 'bg-[#10b981]';
}

function ProblemNavigator({ state, selectedRole, onSelect, onApply, disabled }: ProblemNavigatorProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);

  const isDraggingAction = (e: React.DragEvent) =>
    e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('text/action');

  const problems: Array<{ index: number; problem: (typeof state.problems)[number] }> =
    (state.problems || []).map((problem, index) => ({ index: index + 1, problem }));
  const currentId = state.current_event;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-1 pb-1.5 shrink-0">
        <h3 className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Problem Navigator</h3>
        <span className="text-[10px] text-gray-500 tabular-nums">
          {problems.filter((p) => p.problem.state === 'SOLVED').length}/{problems.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto slim-scroll space-y-1 pr-0.5 min-h-0">
        {problems.map(({ index, problem }) => {
          const isSolved = problem.state === 'SOLVED';
          const isSkipped = problem.state === 'SKIPPED';
          const isSelected = problem.id === currentId;
          const stateLabel = PROBLEM_STATE_LABEL[problem.state] || PROBLEM_STATE_LABEL.UNRESOLVED;
          const isTarget = dragOver === problem.id;
          const justSolved = isSolved && problem.id === state.last_problem;

          return (
            <div
              key={problem.id}
              onClick={() => !disabled && !isSolved && onSelect(problem.id, selectedRole)}
              onDragOver={(e) => {
                if (isDraggingAction(e)) {
                  e.preventDefault();
                  setDragOver(problem.id);
                }
              }}
              onDragLeave={() => setDragOver((cur) => (cur === problem.id ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const action = e.dataTransfer.getData('text/action');
                if (action && !disabled && !isSolved) {
                  onApply(action, problem.id, selectedRole);
                }
                setDragOver(null);
              }}
              className={[
                'nav-row rounded-lg border px-2 py-1.5 transition-all duration-150 cursor-pointer select-none',
                isSelected ? 'border-[#0ea5e9]/70 bg-[#0ea5e9]/10 ring-1 ring-[#0ea5e9]/40 glow-in' : 'border-gray-800/80 bg-gray-900/40',
                isSolved ? 'opacity-60' : isSelected ? '' : 'hover:border-gray-600 hover:bg-gray-800/50',
                isSkipped ? 'opacity-50' : '',
                isTarget ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 scale-[1.02]' : '',
                justSolved ? 'pop-in' : '',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0',
                    isSolved ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-gray-800 text-gray-500',
                  ].join(' ')}
                >
                  {index}
                </span>

                <span className="text-xs font-medium text-white truncate flex-1 min-w-0">
                  {problem.name}
                  {isSolved && <span className="ml-1 text-[#10b981]">✓</span>}
                </span>

                <span className="flex items-center gap-1 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${threatDot(problem.threat_level)}`} />
                  <span className={`text-[10px] font-medium ${threatColor(problem.threat_level)}`}>
                    {problem.threat_label || `${problem.threat_level}/5`}
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between mt-1 pl-7">
                <span className={`text-[9px] px-1.5 py-px rounded-full border font-medium ${stateLabel.cls}`}>
                  {stateLabel.label}
                </span>
                {!isSolved && problem.expected_impact != null && (
                  <span className="text-[9px] text-gray-500 tabular-nums">
                    +{(problem.expected_impact * 100).toFixed(0)}% acc
                  </span>
                )}
                {isTarget && <span className="text-[9px] text-[#10b981] font-medium">Drop to apply</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ProblemNavigator, (prev, next) => {
  return (
    problemsEqual(prev.state, next.state) &&
    prev.selectedRole === next.selectedRole &&
    prev.disabled === next.disabled &&
    prev.onSelect === next.onSelect &&
    prev.onApply === next.onApply
  );
});
