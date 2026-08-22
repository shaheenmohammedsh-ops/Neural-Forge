import { memo } from 'react';
import type { SimulationState } from '../types';
import { ACTION_NAMES, ACTION_SHORT } from '../config/gameplay';
import { solutionsEqual } from '../lib/stateEq';

interface SolutionPaletteProps {
  state: SimulationState;
  selectedAction: string | null;
  onSelectAction: (actionType: string | null) => void;
  disabled?: boolean;
}

function riskSeverity(risk: string): { cls: string; dot: string; level: string } {
  const r = (risk || '').toLowerCase();
  if (r.includes('high') || r.includes('aggressive') || r.includes('costly')) {
    return { level: 'High', cls: 'text-[#ef4444]', dot: 'bg-[#ef4444]' };
  }
  if (r.includes('moderate') || r.includes('medium') || r.includes('overfit')) {
    return { level: 'Moderate', cls: 'text-[#f59e0b]', dot: 'bg-[#f59e0b]' };
  }
  return { level: 'Low', cls: 'text-[#10b981]', dot: 'bg-[#10b981]' };
}

function SolutionPalette({ state, selectedAction, onSelectAction, disabled }: SolutionPaletteProps) {
  const solutions = state.solutions || [];
  const energy = state.neural_energy ?? 0;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between px-1 pb-1.5 shrink-0">
        <h3 className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase">Solution Cards</h3>
        <span className="text-[10px] text-gray-500">click or drag onto a problem</span>
      </div>

      <div className="flex-1 overflow-y-auto slim-scroll grid grid-cols-2 gap-1.5 pr-0.5 min-h-0 content-start">
        {solutions.map((solution) => {
          const affordable = energy >= solution.energy_cost;
          const risk = riskSeverity(solution.risk);
          const isSelected = selectedAction === solution.id;

          return (
            <div
              key={solution.id}
              draggable={!disabled}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/action', solution.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onDragEnd={() => {}}
              onClick={() => {
                if (disabled) return;
                onSelectAction(isSelected ? null : solution.id);
              }}
              title={`${ACTION_NAMES[solution.id] || solution.name}\n${solution.description}\nRisk: ${solution.risk}`}
              className={[
                'card-press group rounded-lg border px-2 py-1.5 cursor-grab active:cursor-grabbing transition-all duration-150 select-none',
                isSelected ? 'border-[#0ea5e9]/70 bg-[#0ea5e9]/10 ring-1 ring-[#0ea5e9]/40' : 'border-gray-800 bg-gray-900/50 hover:border-gray-600',
                !affordable ? 'opacity-50' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-white truncate">
                  {ACTION_SHORT[solution.id] || solution.name}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} title={`${risk.level} risk`} />
                  {isSelected && <span className="text-[#0ea5e9] text-[9px]">✓</span>}
                </span>
              </div>

              <p className="mt-0.5 text-[9px] text-gray-500 leading-snug line-clamp-1">{solution.description}</p>

              <div className="mt-1 flex items-center justify-between text-[9px] text-gray-400 tabular-nums">
                <span className="flex items-center gap-1">
                  <span className="text-[#f59e0b]">⚡</span> {solution.energy_cost}
                </span>
                <span className="flex items-center gap-1">
                  <span className="text-[#0ea5e9]">⏱</span> {solution.time_cost}s
                </span>
                {solution.expected_impact != null && (
                  <span className="text-[#10b981] font-medium">+{(solution.expected_impact * 100).toFixed(0)}%</span>
                )}
                {!affordable && <span className="text-[#ef4444]">low energy</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(SolutionPalette, (prev, next) => {
  return (
    solutionsEqual(prev.state, next.state) &&
    prev.state.neural_energy === next.state.neural_energy &&
    prev.selectedAction === next.selectedAction &&
    prev.disabled === next.disabled &&
    prev.onSelectAction === next.onSelectAction
  );
});
