import type { SimulationState } from '../types';

/**
 * Cheap equality helpers used by memoized gameplay panels.
 *
 * The game clock advances every second, producing a brand-new SimulationState
 * object. These comparators let a panel skip re-rendering unless the data it
 * actually depends on has changed (problems, solutions, nodes, energy, ...).
 */
export function problemsEqual(a: SimulationState, b: SimulationState): boolean {
  if (a.current_event !== b.current_event) return false;
  if (a.last_problem !== b.last_problem) return false;
  const pa = a.problems;
  const pb = b.problems;
  if (pa.length !== pb.length) return false;
  for (let i = 0; i < pa.length; i++) {
    const x = pa[i];
    const y = pb[i];
    if (
      x.id !== y.id ||
      x.state !== y.state ||
      x.threat_level !== y.threat_level ||
      x.expected_impact !== y.expected_impact
    ) {
      return false;
    }
  }
  return true;
}

export function solutionsEqual(a: SimulationState, b: SimulationState): boolean {
  const sa = a.solutions;
  const sb = b.solutions;
  if (sa.length !== sb.length) return false;
  for (let i = 0; i < sa.length; i++) {
    const x = sa[i];
    const y = sb[i];
    if (
      x.id !== y.id ||
      x.energy_cost !== y.energy_cost ||
      x.time_cost !== y.time_cost ||
      x.expected_impact !== y.expected_impact
    ) {
      return false;
    }
  }
  return true;
}

export function nodesEqual(a: SimulationState, b: SimulationState): boolean {
  const na = a.nodes;
  const nb = b.nodes;
  const ka = Object.keys(na);
  if (ka.length !== Object.keys(nb).length) return false;
  for (const id of ka) {
    const x = na[id];
    const y = nb[id];
    if (
      !y ||
      x.energy !== y.energy ||
      x.max_energy !== y.max_energy ||
      x.health_percent !== y.health_percent
    ) {
      return false;
    }
  }
  return true;
}

export function networkEqual(a: SimulationState, b: SimulationState): boolean {
  return (
    nodesEqual(a, b) &&
    a.accuracy === b.accuracy &&
    a.brain_health === b.brain_health &&
    a.current_event === b.current_event
  );
}
