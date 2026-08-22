export type ProblemState = 'UNRESOLVED' | 'SELECTED' | 'IN_PROGRESS' | 'SOLVED' | 'SKIPPED';

export type GameMode = 'solo' | 'team';

export interface NodeInfo {
  energy: number;
  max_energy: number;
  importance: number;
  health_percent: number;
}

export interface ProblemInfo {
  id: string;
  name: string;
  description: string;
  threat_level: number;
  threat_label: string;
  state: ProblemState;
  expected_impact: number;
  recommended_solutions: string[];
}

export interface SolutionInfo {
  id: string;
  name: string;
  description: string;
  energy_cost: number;
  time_cost: number;
  expected_impact: number;
  risk: string;
  educational: string;
  valid_targets: string[];
}

export interface SimulationState {
  accuracy: number;
  loss: number;
  precision: number;
  recall: number;
  brain_health: number;
  neural_energy: number;
  current_event: string | null;
  active_events: string[];
  problem_states: Record<string, string>;
  problems: ProblemInfo[];
  solutions: SolutionInfo[];
  events_solved: number;
  total_events: number;
  nodes: Record<string, NodeInfo>;
  current_level: number;
  time_remaining: number;
  score: number;
  combo: number;
  game_status: 'playing' | 'won' | 'lost';
  end_reason?: string | null;
  outcome?: string | null;
  max_time?: number;
  current_mission?: MissionInfo;
  mission_stage?: MissionStage;
  last_result?: 'correct' | 'incorrect' | null;
  last_message?: string | null;
  last_problem?: string | null;
  last_action?: string | null;
  team_mode?: boolean;
  team_size?: number;
  game_mode?: GameMode;
  active_role?: string | null;
  mission_level?: number;
  mission_title?: string | null;
  mission_subtitle?: string | null;
  difficulty?: string | null;
}

export interface LevelProgress {
  level: number;
  status: 'locked' | 'unlocked' | 'completed';
  attempts: number;
  best_accuracy: number;
  last_outcome?: string | null;
}

export interface ProgressResponse {
  participant_id: number;
  mode: GameMode;
  levels: LevelProgress[];
}

export interface StartSessionResponse {
  session_id: string;
  participant_id: number;
  state: SimulationState;
}

export interface ActionResponse {
  state: SimulationState;
  is_complete?: boolean;
  node_info?: NodeInfo;
}

export interface GameActionResponse {
  state: SimulationState;
  is_complete: boolean;
}

export interface ApplySolutionResponse {
  state: SimulationState;
  is_complete: boolean;
  result?: {
    correct: boolean;
    message?: string;
    accuracy_before?: number;
    accuracy_after?: number;
  };
}

export interface PreviewResponse {
  preview: {
    valid: boolean;
    error?: string;
    action_type: string;
    action_name: string;
    problem: string;
    problem_name: string;
    energy_cost: number;
    time_cost: number;
    expected_impact: number | null;
    risk: string;
    educational: string;
    energy_affordable: boolean;
    already_solved: boolean;
  };
}

export interface SessionResults {
  session: any;
  interactions: any[];
}

export interface ExportData {
  session_id: string;
  timestamp: string;
  interactions_csv: string;
  session_csv: string;
  statistics: {
    total_interactions: number;
    events_solved: number;
    final_accuracy: number;
    avg_accuracy: number;
    avg_brain_health: number;
    avg_neural_energy: number;
    avg_combo: number;
    actions_per_minute: number;
    session_duration_minutes: number;
  };
}

export interface MissionInfo {
  id: number;
  title: string;
  description: string;
  customer_objective: string;
  target_accuracy: number;
  difficulty: string;
  estimated_duration: string;
  current_challenge: string;
}

export type MissionStage =
  | 'briefing'
  | 'dataset_preparation'
  | 'missing_values'
  | 'noise'
  | 'feature_engineering'
  | 'training'
  | 'bias_detection'
  | 'validation'
  | 'concept_drift'
  | 'deployment'
  | 'mission_complete';

export interface MissionStageInfo {
  title: string;
  description: string;
  icon: string;
}

export interface EducationalInsight {
  event: string;
  action: string;
  insight: string;
  real_world_application: string;
}

export interface ErrorResponse {
  detail: string;
}

export interface StartSessionOptions {
  participantId?: string;
  challengeType?: string;
  challengeOrder?: number;
  teamMode?: boolean;
  teamSize?: number;
  gameMode?: GameMode;
  level?: number;
}

export interface TeamDecision {
  id: number;
  role: string;
  problem_id: string;
  action_type: string;
  decision: 'solved' | 'attempted' | 'skipped';
  timestamp: number;
}

export interface Favorite {
  id: number;
  name: string;
}
