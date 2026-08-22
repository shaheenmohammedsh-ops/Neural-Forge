import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { getMissionLevel } from '../config/missions';

interface ResultsScreenProps {
  sessionId: string;
  onRestart: () => void;
  onContinue?: () => void;
}

type Outcome = 'won' | 'timeout' | 'energy_depleted' | 'manual';

const TARGET_ACCURACY = 0.9;
const TOTAL_EVENTS = 7;

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.min(180, Math.floor(seconds)));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function ResultsScreen({ sessionId, onRestart, onContinue }: ResultsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getResults(sessionId);
      setSessionData(response.session);
      setLoading(false);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }, [sessionId]);

  const downloadSessionExcel = useCallback(async () => {
    try {
      setDownloading(true);
      setDownloadSuccess(false);
      const blob = await api.downloadSessionXlsx(sessionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai_brain_lab_session_${sessionId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      setError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#0ea5e9] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a]">
        <div className="text-center p-8 bg-gray-800/50 border border-gray-700/50 rounded-lg max-w-md w-full">
          <p className="text-[#ef4444] mb-4 text-sm">{error}</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={loadResults}
              disabled={loading}
              className={`px-4 py-2 rounded text-white transition-colors text-sm ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-[#0ea5e9] hover:bg-[#0284c7]'}`}
            >
              Try Again
            </button>
            <button
              onClick={onRestart}
              className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors text-sm"
            >
              Back to Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return null;
  }

  // ---------------------------------------------------------------------------
  // Authoritative outcome from the STORED backend result. We never re-derive the
  // outcome from the final displayed values - reaching 90% is always a SUCCESS.
  // ---------------------------------------------------------------------------
  const storedResult = String(sessionData.result || 'manual').toLowerCase();
  const outcome: Outcome =
    storedResult === 'won' || storedResult === 'target_reached'
      ? 'won'
      : storedResult === 'timeout' || storedResult === 'time_expired'
      ? 'timeout'
      : storedResult === 'energy_depleted'
      ? 'energy_depleted'
      : 'manual';

  const isSuccess = outcome === 'won';

  // Validated metrics - clamp everything to realistic ranges.
  const finalAccuracy = Math.max(0, Math.min(1, Number(sessionData.final_accuracy ?? 0)));
  const finalBrainHealth = Math.max(0, Math.min(100, Number(sessionData.final_brain_health ?? 0)));
  const finalEnergy = Math.max(0, Math.min(200, Number(sessionData.final_neural_energy ?? 0)));
  const energyUsed = Math.max(0, Math.round(160 - finalEnergy));
  const finalScore = Math.max(0, Number(sessionData.final_score ?? 0));
  const totalActions = Math.max(0, Number(sessionData.total_actions ?? 0));
  const eventsSolved = Math.max(0, Math.min(TOTAL_EVENTS, Number(sessionData.events_solved ?? 0)));
  const eventsRemaining = TOTAL_EVENTS - eventsSolved;
  const completionTimeSeconds = Math.max(0, Math.min(180, Number(sessionData.completion_time ?? 0)));

  const accuracyPercent = Math.round(finalAccuracy * 1000) / 10;
  const progress = Math.min(100, (finalAccuracy / TARGET_ACCURACY) * 100);

  // Mission identity for the debrief (authoritative from the stored session).
  const missionLevel = Math.max(1, Math.min(4, Number(sessionData.mission_level ?? sessionData.level ?? 1)));
  const mission = getMissionLevel(missionLevel);
  const missionTitle = String(sessionData.challenge_type || mission.title);
  const missionDifficulty = String(sessionData.difficulty || mission.difficulty);
  const nextUnlocked = missionLevel < 4;

  const headline: Record<Outcome, { eyebrow: string; title: string; subtitle: string; reason: string }> = {
    won: {
      eyebrow: 'Mission Complete',
      title: 'Mission Complete',
      subtitle: 'Target reached — your AI achieved the 90% accuracy goal within the mission.',
      reason: 'Target Reached',
    },
    timeout: {
      eyebrow: 'Not Achieved',
      title: 'Target Not Reached',
      subtitle: 'Time up — the 3-minute mission timer expired before reaching the 90% accuracy target.',
      reason: 'Time Up',
    },
    energy_depleted: {
      eyebrow: 'Not Achieved',
      title: 'Target Not Reached',
      subtitle: 'Energy depleted — the available AI energy ran out before reaching the 90% accuracy target.',
      reason: 'Energy Depleted',
    },
    manual: {
      eyebrow: 'Session Ended',
      title: 'Session Ended',
      subtitle: 'The mission ended before the 90% accuracy target was reached.',
      reason: 'Ended Manually',
    },
  };

  const activeHeadline = headline[outcome];

  const iconColor = isSuccess ? 'text-[#10b981]' : 'text-[#ef4444]';
  const ringColor = isSuccess ? 'border-[#10b981]/40 bg-[#10b981]/15' : 'border-[#ef4444]/40 bg-[#ef4444]/15';
  const accentText = isSuccess ? 'text-[#10b981]' : 'text-[#ef4444]';

  const renderOutcomeIcon = () => {
    const className = `w-10 h-10 ${iconColor}`;
    if (isSuccess) {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (outcome === 'timeout') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    if (outcome === 'energy_depleted') {
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      );
    }
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    );
  };

  const MetricTile = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
    <div className="rounded-xl border border-gray-700/40 bg-gray-900/50 p-4">
      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0e1a] py-10 px-4 sm:px-6">
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Mission header strip */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-gray-700/50 bg-gray-900/60 backdrop-blur px-4 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Mission {missionLevel}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="text-sm font-semibold text-white">{missionTitle}</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span className="text-[11px] text-gray-400">{missionDifficulty}</span>
          </div>
        </div>

        {/* Outcome Banner */}
        <div
          className={`relative overflow-hidden rounded-2xl border p-8 sm:p-10 text-center mb-8 fade-in ${
            isSuccess
              ? 'border-[#10b981]/40 bg-gradient-to-b from-[#10b981]/10 via-[#0a0e1a] to-[#0a0e1a]'
              : 'border-[#ef4444]/40 bg-gradient-to-b from-[#ef4444]/10 via-[#0a0e1a] to-[#0a0e1a]'
          }`}
        >
          <div className={`pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl ${isSuccess ? 'bg-[#10b981]/10' : 'bg-[#ef4444]/10'}`} />
          <div className="relative">
            <div className={`mx-auto mb-6 flex items-center justify-center w-20 h-20 rounded-full border ${ringColor}`}>
              {renderOutcomeIcon()}
            </div>
            <p className={`text-[11px] font-semibold tracking-[0.25em] uppercase mb-3 ${accentText}`}>
              {activeHeadline.eyebrow}
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">
              {activeHeadline.title}
            </h1>
            <p className="text-sm text-gray-400 max-w-xl mx-auto mb-6 leading-relaxed">
              {activeHeadline.subtitle}
            </p>
            <span
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium border ${
                isSuccess
                  ? 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30'
                  : 'bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
              {activeHeadline.reason}
            </span>
          </div>
        </div>

        {/* Next Mission */}
        {isSuccess && nextUnlocked && (
          <div className="rounded-2xl border border-[#10b981]/30 bg-[#10b981]/5 p-5 mb-6 slide-up">
            <div className="flex items-center gap-4">
              <span className="flex items-center justify-center w-11 h-11 rounded-full border border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981] shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">Next Mission</p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  Mission {missionLevel + 1}: {getMissionLevel(missionLevel + 1).title} — {getMissionLevel(missionLevel + 1).subtitle}. All missions are available any time.
                </p>
              </div>
              <button
                onClick={() => (onContinue ? onContinue() : window.location.reload())}
                className="btn-primary px-4 py-2 text-xs whitespace-nowrap"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Performance Summary */}
        <div className="rounded-2xl border border-gray-700/40 bg-gray-900/40 p-6 mb-6 slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-sm font-semibold text-white tracking-tight">Performance Summary</h2>
            <span className="text-xs text-gray-500">{totalActions} actions recorded</span>
          </div>

          {/* Accuracy vs target */}
          <div className="mb-6">
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Final Accuracy</p>
                <p
                  className={`text-4xl font-semibold tracking-tight ${
                    isSuccess
                      ? 'text-[#10b981]'
                      : finalAccuracy >= 0.7
                      ? 'text-[#0ea5e9]'
                      : 'text-[#f59e0b]'
                  }`}
                >
                  {accuracyPercent.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Target Accuracy</p>
                <p className="text-2xl font-semibold text-white">{(TARGET_ACCURACY * 100).toFixed(0)}%</p>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-gray-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isSuccess ? 'bg-[#10b981]' : finalAccuracy >= 0.7 ? 'bg-[#0ea5e9]' : 'bg-[#f59e0b]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <MetricTile label="Final Brain Health" value={`${finalBrainHealth.toFixed(1)}%`} accent="text-[#0ea5e9]" />
            <MetricTile label="Final Score" value={String(finalScore)} accent="text-[#7c3aed]" />
            <MetricTile label="Energy Used" value={String(energyUsed)} accent="text-[#f59e0b]" />
            <MetricTile label="Elapsed Time" value={formatTime(completionTimeSeconds)} accent="text-[#10b981]" />
            <MetricTile label="Problems Solved" value={`${eventsSolved} / ${TOTAL_EVENTS}`} accent="text-[#3b82f6]" />
            <MetricTile label="Problems Remaining" value={String(eventsRemaining)} accent="text-gray-300" />
          </div>
        </div>

        {/* Session Report / Download */}
        <div className="rounded-2xl border border-gray-700/40 bg-gray-900/40 p-6 mb-6 slide-up">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-[#0ea5e9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-sm font-semibold text-white tracking-tight">Session Report</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Download the complete research-grade session analysis as an Excel workbook, including
            accuracy history, brain health, energy usage, and every action recorded.
          </p>

          <button
            onClick={downloadSessionExcel}
            disabled={downloading}
            className={`w-full px-6 py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm ${
              isSuccess
                ? 'bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] hover:from-[#0284c7] hover:to-[#2563eb]'
                : 'bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] hover:from-[#0284c7] hover:to-[#2563eb]'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Preparing report...
              </>
            ) : downloadSuccess ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Report downloaded successfully
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Session Report (.xlsx)
              </>
            )}
          </button>
        </div>

        {/* Footer actions */}
        <div className="text-center mb-4">
          <button
            onClick={onRestart}
            className="px-8 py-3 bg-gray-700 text-white font-medium rounded-xl hover:bg-gray-600 transition-colors text-sm"
          >
            Start New Session
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-600 tracking-wide">
          AI Brain Lab &middot; Neural Shield Research Session
        </p>
      </div>
    </div>
  );
}

export default ResultsScreen;
