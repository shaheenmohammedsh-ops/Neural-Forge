import type {
  ActionResponse,
  ApplySolutionResponse,
  GameActionResponse,
  PreviewResponse,
  ProgressResponse,
  SessionResults,
  StartSessionOptions,
} from '../types';

// API base URL - configurable via VITE_API_BASE env var (Vite exposes VITE_* vars via import.meta.env)
// For local development, defaults to localhost:8080
// For production deployment, set VITE_API_BASE to the deployed backend URL (e.g., https://api.example.com)
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8080';

async function post<T>(path: string, body: unknown, errorMsg: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(errorMsg);
  return response.json() as Promise<T>;
}

async function get<T>(path: string, errorMsg: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error(errorMsg);
  return response.json() as Promise<T>;
}

export const api = {
  async startSession(options: StartSessionOptions = {}): Promise<any> {
    return post('/start-session', {
      participant_id: options.participantId ?? null,
      challenge_type: options.challengeType,
      challenge_order: options.challengeOrder,
      team_mode: options.teamMode ?? false,
      team_size: options.teamSize ?? 1,
      game_mode: options.gameMode ?? 'solo',
      level: options.level ?? 1,
    }, 'Failed to start session');
  },

  async getProgress(participantId: string, mode: string = 'solo'): Promise<ProgressResponse> {
    const q = encodeURIComponent(participantId);
    const m = encodeURIComponent(mode);
    return get(`/progress?participant_id=${q}&mode=${m}`, 'Failed to load progress');
  },

  async applyAction(
    sessionId: string,
    actionType: string,
    targetNode?: string,
    energyAllocated?: number,
    sourceNode?: string,
    targetNodeConnect?: string
  ): Promise<ActionResponse> {
    return post('/apply-action', {
      session_id: sessionId,
      action_type: actionType,
      target_node: targetNode,
      energy_allocated: energyAllocated,
      source_node: sourceNode,
      target_node_connect: targetNodeConnect,
    }, 'Failed to apply action');
  },

  async applyGameAction(sessionId: string, actionType: string, targetEvent?: string): Promise<GameActionResponse> {
    return post('/apply-game-action', {
      session_id: sessionId,
      action_type: actionType,
      target_event: targetEvent,
    }, 'Failed to apply game action');
  },

  async selectProblem(sessionId: string, problemId: string, role?: string): Promise<GameActionResponse> {
    return post('/select-problem', {
      session_id: sessionId,
      problem_id: problemId,
      role,
    }, 'Failed to select problem');
  },

  async skipProblem(sessionId: string, problemId: string, role?: string): Promise<GameActionResponse> {
    return post('/skip-problem', {
      session_id: sessionId,
      problem_id: problemId,
      role,
    }, 'Failed to skip problem');
  },

  async revisitProblem(sessionId: string, problemId: string, role?: string): Promise<GameActionResponse> {
    return post('/revisit-problem', {
      session_id: sessionId,
      problem_id: problemId,
      role,
    }, 'Failed to revisit problem');
  },

  async setRole(sessionId: string, role: string): Promise<GameActionResponse> {
    return post('/set-role', {
      session_id: sessionId,
      role,
    }, 'Failed to set role');
  },

  async previewAction(sessionId: string, actionType: string, targetEvent: string): Promise<PreviewResponse> {
    return post('/preview-action', {
      session_id: sessionId,
      action_type: actionType,
      target_event: targetEvent,
    }, 'Failed to preview action');
  },

  async applySolution(
    sessionId: string,
    actionType: string,
    targetEvent: string,
    opts: { role?: string; decisionTime?: number; reactionTime?: number } = {}
  ): Promise<ApplySolutionResponse> {
    return post('/apply-solution', {
      session_id: sessionId,
      action_type: actionType,
      target_event: targetEvent,
      role: opts.role,
      decision_time: opts.decisionTime,
      reaction_time: opts.reactionTime,
    }, 'Failed to apply solution');
  },

  async advanceTime(sessionId: string, seconds: number): Promise<GameActionResponse> {
    return post('/advance-time', {
      session_id: sessionId,
      action_type: String(seconds),
    }, 'Failed to advance time');
  },

  async finishSession(sessionId: string, finalMetrics: any, challengeType?: string, challengeOrder?: number): Promise<any> {
    return post('/finish-session', {
      session_id: sessionId,
      ...finalMetrics,
      challenge_type: challengeType,
      challenge_order: challengeOrder,
    }, 'Failed to finish session');
  },

  async getResults(sessionId: string): Promise<SessionResults> {
    const q = encodeURIComponent(sessionId);
    return get(`/results?session_id=${q}`, 'Failed to fetch results');
  },

  async downloadSessionXlsx(sessionId: string): Promise<Blob> {
    const q = encodeURIComponent(sessionId);
    const response = await fetch(`${API_BASE}/export/session-xlsx?session_id=${q}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to export session');
    return response.blob();
  },
};
