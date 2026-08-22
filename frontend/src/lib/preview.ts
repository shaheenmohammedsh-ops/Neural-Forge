import type { SimulationState } from '../types';

export interface LocalPreview {
  valid: boolean;
  actionType: string;
  problemId: string | null;
  problemName: string | null;
  energyCost: number;
  timeCost: number;
  expectedImpact: number | null;
  risk: string;
  educational: string;
  affordable: boolean;
  alreadySolved: boolean;
  reason: string | null;
}

export function computePreview(state: SimulationState, actionType: string, problemId: string | null): LocalPreview {
  const solution = (state.solutions || []).find((s) => s.id === actionType);
  const problem = (state.problems || []).find((p) => p.id === problemId);

  const base: LocalPreview = {
    valid: false,
    actionType,
    problemId,
    problemName: problem?.name ?? null,
    energyCost: solution?.energy_cost ?? 0,
    timeCost: solution?.time_cost ?? 0,
    expectedImpact: null,
    risk: solution?.risk ?? '',
    educational: solution?.educational ?? '',
    affordable: (state.neural_energy ?? 0) >= (solution?.energy_cost ?? 0),
    alreadySolved: problem?.state === 'SOLVED',
    reason: null,
  };

  if (!solution) {
    base.reason = 'Unknown solution';
    return base;
  }
  if (!problem) {
    base.reason = 'Select a problem first';
    return base;
  }
  if (problem.state === 'SOLVED') {
    base.reason = 'Problem already solved';
    return base;
  }

  base.valid = Array.isArray(solution.valid_targets) && solution.valid_targets.includes(problem.id);
  if (!base.valid) {
    base.reason = 'This solution does not address that problem';
    return base;
  }

  base.expectedImpact = problem.expected_impact ?? solution.expected_impact ?? null;
  return base;
}
