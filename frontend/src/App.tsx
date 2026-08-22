import { useState, useEffect, useRef, useCallback } from 'react';
import { getMissionLevel } from './config/missions';
import LandingScreen from './pages/LandingScreen';
import GameModeSelection from './components/GameModeSelection';
import LevelSelectScreen from './pages/LevelSelectScreen';
import MissionBriefing from './components/MissionBriefing';
import ResultsScreen from './pages/ResultsScreen';
import GameplayScreen from './components/GameplayScreen';
import NeuralBackground from './components/NeuralBackground';
import AudioManager from './components/AudioManager';
import AudioControls from './components/AudioControls';
import CinematicTransition from './components/CinematicTransition';
import { api } from './services/api';
import type { GameMode, SimulationState } from './types';
import { computePreview } from './lib/preview';

type Screen = 'landing' | 'mode' | 'levelSelect' | 'briefing' | 'simulation' | 'results';

// Set to true to re-enable the "Insight Unlocked" popup after a problem is solved.
const ENABLE_INSIGHTS = false;

function getParticipantId(): string {
  const key = 'neural-shield-participant';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(key, id);
  return id;
}

const playClick = () => {
  const fn = (window as any).playClickSound;
  if (fn) fn();
};

function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participantId] = useState<string>(() => getParticipantId());
  const [level, setLevel] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [simulationState, setSimulationState] = useState<SimulationState | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [educationalInsight, setEducationalInsight] = useState<{ event: string | null; action: string; show: boolean }>({ event: null, action: '', show: false });
  const [selectedRole, setSelectedRole] = useState('Data Analyst');
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<{ actionType: string; problemId: string; role: string } | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(() => localStorage.getItem('neural-shield-music') !== '0');
  const [sfxEnabled, setSfxEnabled] = useState(() => localStorage.getItem('neural-shield-sfx') !== '0');

  const finishingRef = useRef(false);
  const problemSelectTimeRef = useRef<number>(0);
  const actionSelectTimeRef = useRef<number>(0);

  // Stable refs keep async handlers stable across renders so memoized panels
  // (and the game loop) never re-subscribe or re-render unnecessarily.
  const sessionIdRef = useRef(sessionId);
  const simulationStateRef = useRef(simulationState);
  const gameModeRef = useRef(gameMode);
  const levelRef = useRef(level);
  const selectedRoleRef = useRef(selectedRole);
  const selectedActionRef = useRef(selectedAction);
  sessionIdRef.current = sessionId;
  simulationStateRef.current = simulationState;
  gameModeRef.current = gameMode;
  levelRef.current = level;
  selectedRoleRef.current = selectedRole;
  selectedActionRef.current = selectedAction;

  const mission = getMissionLevel(level);

  useEffect(() => {
    localStorage.setItem('neural-shield-music', musicEnabled ? '1' : '0');
  }, [musicEnabled]);
  useEffect(() => {
    localStorage.setItem('neural-shield-sfx', sfxEnabled ? '1' : '0');
  }, [sfxEnabled]);

  const handleStart = useCallback(() => {
    playClick();
    setLevel(1);
    setGameMode('solo');
    setScreen('mode');
  }, []);

  const handleSelectMode = useCallback((mode: GameMode) => {
    playClick();
    setGameMode(mode);
    setScreen('levelSelect');
  }, []);

  const handleSelectLevel = useCallback((nextLevel: number) => {
    playClick();
    setLevel(nextLevel);
    setScreen('briefing');
  }, []);

  const beginSession = useCallback(
    async (teamSize?: number) => {
      if (finishingRef.current) return;
      const m = getMissionLevel(levelRef.current);
      setSimulationState(null);
      setSelectedAction(null);
      setScreen('simulation');
      try {
        const data = await api.startSession({
          participantId,
          challengeType: m.title,
          challengeOrder: m.level,
          teamMode: gameMode === 'team',
          teamSize: gameMode === 'team' ? teamSize ?? 3 : 1,
          gameMode,
          level: m.level,
        });
        setSessionId(data.session_id);
        setSimulationState(data.state);
        setShowTutorial(true);
      } catch (err) {
        console.error('Failed to start session', err);
        setScreen('briefing');
      }
    },
    [participantId, gameMode]
  );

  const handleGameEnd = useCallback(async () => {
    const sid = sessionIdRef.current;
    const state = simulationStateRef.current;
    if (!sid || finishingRef.current) return;
    finishingRef.current = true;
    setPendingDecision(null);
    try {
      const title = getMissionLevel(levelRef.current).title;
      await api.finishSession(sid, { result: state?.outcome, game_mode: gameModeRef.current }, title, levelRef.current);
      setScreen('results');
    } catch (err) {
      console.error('Failed to finish session', err);
    }
  }, []);

  const runAction = useCallback(async (actionType: string, targetEvent?: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const response = await api.applyGameAction(sid, actionType, targetEvent);
      setSimulationState(response.state);
      if (response.state.game_status !== 'playing') {
        handleGameEnd();
        return;
      }
      if (ENABLE_INSIGHTS && response.state.last_result === 'correct' && response.state.last_problem) {
        setEducationalInsight({ event: response.state.last_problem, action: response.state.last_action || '', show: true });
      }
    } catch (err) {
      console.error('Failed to run action', err);
    }
  }, [handleGameEnd]);

  const handleSelectProblem = useCallback(async (problemId: string, role: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      problemSelectTimeRef.current = Date.now();
      const response = await api.selectProblem(sid, problemId, role);
      setSimulationState(response.state);
      setEducationalInsight({ event: null, action: '', show: false });
    } catch (err) {
      console.error('Failed to select problem', err);
    }
  }, []);

  const handleSkip = useCallback(async (problemId: string, role: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const response = await api.skipProblem(sid, problemId, role);
      setSimulationState(response.state);
    } catch (err) {
      console.error('Failed to skip problem', err);
    }
  }, []);

  const handleRevisit = useCallback(async (problemId: string, role: string) => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    try {
      const response = await api.revisitProblem(sid, problemId, role);
      setSimulationState(response.state);
    } catch (err) {
      console.error('Failed to revisit problem', err);
    }
  }, []);

  const handleApplySolution = useCallback(async (actionType: string, problemId: string, role: string) => {
    const sid = sessionIdRef.current;
    const st = simulationStateRef.current;
    if (!sid || !st || finishingRef.current) return;
    const now = Date.now();
    const decisionTime = problemSelectTimeRef.current ? now - problemSelectTimeRef.current : 0;
    const reactionTime = actionSelectTimeRef.current ? now - actionSelectTimeRef.current : 0;
    try {
      const response = await api.applySolution(sid, actionType, problemId, {
        role,
        decisionTime: decisionTime > 0 ? decisionTime : undefined,
        reactionTime: reactionTime > 0 ? reactionTime : undefined,
      });
      setSimulationState(response.state);
      if (response.state.game_status !== 'playing') {
        handleGameEnd();
        return;
      }
      if (ENABLE_INSIGHTS && response.state.last_result === 'correct' && response.state.last_problem) {
        setEducationalInsight({ event: response.state.last_problem, action: response.state.last_action || '', show: true });
      }
    } catch (err) {
      console.error('Failed to apply solution', err);
    }
  }, [handleGameEnd]);

  const requestApply = useCallback(
    (actionType: string, problemId: string, role: string) => {
      const st = simulationStateRef.current;
      if (!st || finishingRef.current) return;
      if ((st.game_mode ?? gameModeRef.current) === 'team') {
        setPendingDecision({ actionType, problemId, role });
        return;
      }
      handleApplySolution(actionType, problemId, role);
    },
    [handleApplySolution]
  );

  const handleApplySelected = useCallback(() => {
    const st = simulationStateRef.current;
    const action = selectedActionRef.current;
    if (!st || !action || !st.current_event) return;
    requestApply(action, st.current_event, selectedRoleRef.current);
  }, [requestApply]);

  const handleSkipCurrent = useCallback(() => {
    const st = simulationStateRef.current;
    if (st?.current_event) handleSkip(st.current_event, selectedRoleRef.current);
  }, [handleSkip]);

  const handleRevisitCurrent = useCallback(() => {
    const st = simulationStateRef.current;
    if (st?.current_event) handleRevisit(st.current_event, selectedRoleRef.current);
  }, [handleRevisit]);

  const handleSelectAction = useCallback((action: string | null) => {
    setSelectedAction(action);
    actionSelectTimeRef.current = action ? Date.now() : 0;
  }, []);

  const handleRoleChange = useCallback((role: string) => {
    setSelectedRole(role);
    actionSelectTimeRef.current = Date.now();
    const sid = sessionIdRef.current;
    const st = simulationStateRef.current;
    if (sid && st && (st.game_mode ?? gameModeRef.current) === 'team' && role !== (st.active_role ?? null)) {
      api
        .setRole(sid, role)
        .then((response) => setSimulationState(response.state))
        .catch((err) => console.error('Failed to set role', err));
    }
  }, []);

  const closeInsight = useCallback(() => {
    setEducationalInsight({ event: null, action: '', show: false });
  }, []);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
  }, []);

  useEffect(() => {
    if (!sessionIdRef.current || screen !== 'simulation') return;

    const interval = setInterval(async () => {
      try {
        const response = await api.advanceTime(sessionIdRef.current!, 1);
        setSimulationState(response.state);
        if (ENABLE_INSIGHTS && response.state.last_result === 'correct' && response.state.last_problem) {
          setEducationalInsight({ event: response.state.last_problem, action: response.state.last_action || '', show: true });
        }
        if (response.state.game_status !== 'playing') {
          handleGameEnd();
        }
      } catch (err) {
        console.error('Failed to advance time', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [screen, handleGameEnd]);

  const handleRestart = useCallback(() => {
    setSessionId(null);
    setSimulationState(null);
    setScreen('landing');
    finishingRef.current = false;
    setSelectedAction(null);
    setPendingDecision(null);
  }, []);

  const handleBackFromLevelSelect = useCallback(() => setScreen('mode'), []);
  const handleBackFromBriefing = useCallback(() => setScreen('levelSelect'), []);

  const handleContinueFromResults = useCallback(() => {
    setSessionId(null);
    setSimulationState(null);
    finishingRef.current = false;
    setSelectedAction(null);
    setPendingDecision(null);
    setLevel((l) => Math.min(4, l + 1));
    setScreen('levelSelect');
  }, []);

  const renderScreen = () => {
    if (screen === 'landing') {
      return <LandingScreen onStart={handleStart} />;
    }

    if (screen === 'mode') {
      return <GameModeSelection onSelect={handleSelectMode} />;
    }

    if (screen === 'levelSelect') {
      return (
        <LevelSelectScreen
          participantId={participantId}
          gameMode={gameMode}
          onSelectLevel={handleSelectLevel}
          onBack={handleBackFromLevelSelect}
        />
      );
    }

    if (screen === 'briefing') {
      return (
        <MissionBriefing level={mission.level} gameMode={gameMode} onStart={beginSession} onBack={handleBackFromBriefing} />
      );
    }

    if (screen === 'results') {
      return (
        <ResultsScreen sessionId={sessionId!} onRestart={handleRestart} onContinue={handleContinueFromResults} />
      );
    }

    if (!simulationState) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-[11px] font-semibold tracking-[0.3em] uppercase text-[#38bdf8] mb-3">
              Mission {mission.level} · {mission.title}
            </div>
            <div className="h-0.5 w-40 mx-auto bg-gray-800 overflow-hidden rounded-full">
              <div className="h-full w-1/2 bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] boot-bar" />
            </div>
            <p className="mt-4 text-sm text-gray-400">Booting simulation</p>
          </div>
        </div>
      );
    }

    const disabled = simulationState.game_status !== 'playing';
    const preview = selectedAction ? computePreview(simulationState, selectedAction, simulationState.current_event) : null;
    const isTeam = (simulationState.game_mode ?? gameMode) === 'team';
    const pendingProblem = pendingDecision
      ? simulationState.problems.find((p) => p.id === pendingDecision.problemId)
      : null;

    return (
      <GameplayScreen
        state={simulationState}
        mission={mission}
        disabled={disabled}
        isTeam={isTeam}
        selectedRole={selectedRole}
        selectedAction={selectedAction}
        preview={preview}
        insight={educationalInsight}
        showTutorial={showTutorial}
        pendingDecision={pendingDecision}
        pendingProblemName={pendingProblem?.name ?? null}
        onSelectProblem={handleSelectProblem}
        onApplyToProblem={requestApply}
        onRunAction={runAction}
        onSelectAction={handleSelectAction}
        onRoleChange={handleRoleChange}
        onApplySelected={handleApplySelected}
        onSkip={handleSkipCurrent}
        onRevisit={handleRevisitCurrent}
        onCloseInsight={closeInsight}
        onCloseTutorial={closeTutorial}
        onConfirmDecision={() => {
          if (!pendingDecision) return;
          const { actionType, problemId, role } = pendingDecision;
          setPendingDecision(null);
          handleApplySolution(actionType, problemId, role);
        }}
        onCancelDecision={() => setPendingDecision(null)}
      />
    );
  };

  return (
    <div className="min-h-screen">
      {/* Stable shell: background, audio, controls and transition layer persist
          across routes and are never torn down during navigation. */}
      <NeuralBackground />
      <AudioManager musicEnabled={musicEnabled} sfxEnabled={sfxEnabled} />
      <div key={`${screen}:${level}`} className="relative z-10 screen-enter">
        {renderScreen()}
      </div>
      <AudioControls
        musicEnabled={musicEnabled}
        sfxEnabled={sfxEnabled}
        onToggleMusic={() => setMusicEnabled((v) => !v)}
        onToggleSfx={() => setSfxEnabled((v) => !v)}
      />
      <CinematicTransition screen={screen} keyValue={String(level)} />
    </div>
  );
}

export default App;
