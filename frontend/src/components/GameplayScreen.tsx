import { memo } from 'react';
import type { MissionLevelInfo } from '../config/missions';
import type { SimulationState } from '../types';
import type { LocalPreview } from '../lib/preview';
import HUD from './HUD';
import TeamBar from './TeamBar';
import ProblemNavigator from './ProblemNavigator';
import NeuralNetwork from './NeuralNetwork';
import ProblemDetails from './ProblemDetails';
import SolutionPalette from './SolutionPalette';
import ActionPreview from './ActionPreview';
import EducationalInsight from './EducationalInsight';
import TutorialPopup from './TutorialPopup';

interface PendingDecision {
  actionType: string;
  problemId: string;
  role: string;
}

interface GameplayScreenProps {
  state: SimulationState;
  mission: MissionLevelInfo;
  disabled: boolean;
  isTeam: boolean;
  selectedRole: string;
  selectedAction: string | null;
  preview: LocalPreview | null;
  insight: { event: string | null; action: string; show: boolean };
  showTutorial: boolean;
  pendingDecision: PendingDecision | null;
  pendingProblemName: string | null;
  onSelectProblem: (problemId: string, role: string) => void;
  onApplyToProblem: (actionType: string, problemId: string, role: string) => void;
  onRunAction: (actionType: string, targetEvent?: string) => void;
  onSelectAction: (action: string | null) => void;
  onRoleChange: (role: string) => void;
  onApplySelected: () => void;
  onSkip: () => void;
  onRevisit: () => void;
  onCloseInsight: () => void;
  onCloseTutorial: () => void;
  onConfirmDecision: () => void;
  onCancelDecision: () => void;
}

function GameplayScreen({
  state,
  mission,
  disabled,
  isTeam,
  selectedRole,
  selectedAction,
  preview,
  insight,
  showTutorial,
  pendingDecision,
  pendingProblemName,
  onSelectProblem,
  onApplyToProblem,
  onRunAction,
  onSelectAction,
  onRoleChange,
  onApplySelected,
  onSkip,
  onRevisit,
  onCloseInsight,
  onCloseTutorial,
  onConfirmDecision,
  onCancelDecision,
}: GameplayScreenProps) {
  const currentEvent = state.current_event;
  const currentState = currentEvent ? state.problem_states[currentEvent] : undefined;

  return (
    <div className="relative h-screen min-h-0 overflow-hidden text-gray-200">
      <div className="relative z-10 h-full flex flex-col min-h-0">
        <HUD state={state} lastMessage={state.last_message} lastResult={state.last_result} />

        <TeamBar teamMode={isTeam} selectedRole={selectedRole} onRoleChange={onRoleChange} disabled={disabled} />

        <div className="flex-1 min-h-0 pt-2 pb-2 grid grid-cols-3 gap-2.5">
          {/* Left column: Problems */}
          <section className="min-h-0 min-w-0 flex flex-col gap-2.5">
            <div className="rounded-lg border border-gray-800 bg-gray-950/50 backdrop-blur-sm flex-1 min-h-0 p-2 flex flex-col overflow-hidden">
              <ProblemNavigator
                state={state}
                selectedRole={selectedRole}
                onSelect={onSelectProblem}
                onApply={onApplyToProblem}
                disabled={disabled}
              />
            </div>

            <ProblemDetails state={state} />
          </section>

          {/* Center column: Neural Network */}
          <section className="min-h-0 min-w-0">
            <div className="h-full rounded-lg border border-gray-800 bg-gray-950/50 backdrop-blur-sm p-2 flex flex-col overflow-hidden">
              <NeuralNetwork
                state={state}
                onAction={onRunAction}
                objective={mission.customer_objective}
                targetAccuracy={mission.target_accuracy}
              />
            </div>
          </section>

          {/* Right column: Solutions */}
          <section className="min-h-0 min-w-0 flex flex-col gap-2.5">
            <div className="rounded-lg border border-gray-800 bg-gray-950/50 backdrop-blur-sm flex-1 min-h-0 p-2 flex flex-col overflow-hidden">
              <SolutionPalette
                state={state}
                selectedAction={selectedAction}
                onSelectAction={onSelectAction}
                disabled={disabled}
              />
            </div>

            <ActionPreview
              preview={preview}
              onApply={onApplySelected}
              onSkip={onSkip}
              onRevisit={onRevisit}
              skipped={!!currentEvent && currentState === 'SKIPPED'}
              hasProblem={!!currentEvent}
              canAct={!!currentEvent && currentState !== 'SOLVED'}
              disabled={disabled}
            />
          </section>
        </div>
      </div>

      <EducationalInsight
        event={insight.event}
        action={insight.action}
        show={insight.show}
        onClose={onCloseInsight}
      />

      {showTutorial && <TutorialPopup onClose={onCloseTutorial} />}

      {pendingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="rounded-xl border border-[#7c3aed]/40 bg-gray-900 p-5 max-w-sm w-full pop-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg leading-none">👥</span>
              <h3 className="text-sm font-semibold text-white">Team Decision</h3>
            </div>
            <p className="text-sm text-gray-300 mb-5">
              Apply <span className="text-[#a78bfa] font-medium">{pendingDecision.actionType}</span> to{' '}
              <span className="text-[#a78bfa] font-medium">{pendingProblemName ?? pendingDecision.problemId}</span> as{' '}
              <span className="text-[#a78bfa] font-medium">{pendingDecision.role}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancelDecision}
                className="px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-300 hover:border-gray-500 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={onConfirmDecision}
                className="px-4 py-2 rounded-lg bg-[#7c3aed] text-sm text-white font-medium hover:bg-[#6d28d9] transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Pass-through handlers are bound to App's stable callbacks, so GameplayScreen
// only re-renders when the simulation state reference actually changes.
export default memo(GameplayScreen);
