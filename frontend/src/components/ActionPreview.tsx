import { memo } from 'react';
import type { LocalPreview } from '../lib/preview';

interface ActionPreviewProps {
  preview: LocalPreview | null;
  onApply: () => void;
  onSkip: () => void;
  onRevisit: () => void;
  skipped: boolean;
  hasProblem: boolean;
  canAct: boolean;
  disabled?: boolean;
}

function riskChip(risk: string): { label: string; cls: string } {
  const r = (risk || '').toLowerCase();
  if (r.includes('high') || r.includes('aggressive') || r.includes('costly')) {
    return { label: 'High risk', cls: 'text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/10' };
  }
  if (r.includes('moderate') || r.includes('medium') || r.includes('overfit')) {
    return { label: 'Moderate', cls: 'text-[#f59e0b] border-[#f59e0b]/40 bg-[#f59e0b]/10' };
  }
  return { label: 'Low risk', cls: 'text-[#10b981] border-[#10b981]/40 bg-[#10b981]/10' };
}

function ActionPreview({ preview, onApply, onSkip, onRevisit, skipped, hasProblem, canAct, disabled }: ActionPreviewProps) {
  const showSkip = hasProblem && canAct;

  return (
    <div className="shrink-0 rounded-lg border border-gray-800 bg-gray-900/50 p-2">
      {preview ? (
        <>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-white truncate min-w-0">
              {preview.actionType}
              {preview.problemName ? (
                <span className="text-gray-400 font-normal"> → {preview.problemName}</span>
              ) : null}
            </span>
            {preview.valid ? (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-[#10b981]/40 bg-[#10b981]/10 text-[#10b981] font-medium">
                Effective
              </span>
            ) : (
              <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-full border border-gray-600 bg-gray-800 text-gray-400 font-medium">
                No effect
              </span>
            )}
          </div>

          <div className="mt-1.5 grid grid-cols-4 gap-1">
            <div className="rounded bg-gray-800/70 px-1.5 py-1 text-center min-w-0">
              <div className="text-[8px] uppercase text-gray-500">Cost</div>
              <div className="text-xs font-semibold text-[#f59e0b] tabular-nums">⚡{preview.energyCost}</div>
            </div>
            <div className="rounded bg-gray-800/70 px-1.5 py-1 text-center min-w-0">
              <div className="text-[8px] uppercase text-gray-500">Time</div>
              <div className="text-xs font-semibold text-[#0ea5e9] tabular-nums">{preview.timeCost}s</div>
            </div>
            <div className="rounded bg-gray-800/70 px-1.5 py-1 text-center min-w-0">
              <div className="text-[8px] uppercase text-gray-500">Impact</div>
              <div className="text-xs font-semibold text-[#10b981] tabular-nums">
                {preview.expectedImpact != null ? `+${(preview.expectedImpact * 100).toFixed(0)}%` : '—'}
              </div>
            </div>
            <div className="rounded bg-gray-800/70 px-1.5 py-1 text-center min-w-0">
              <div className="text-[8px] uppercase text-gray-500">Risk</div>
              <span
                className={`inline-block mt-0.5 text-[8px] px-1 py-px rounded-full border font-medium ${riskChip(preview.risk).cls}`}
              >
                {riskChip(preview.risk).label}
              </span>
            </div>
          </div>

          {preview.reason && (
            <p className="mt-1.5 text-[10px] text-gray-400 leading-snug line-clamp-2">
              {preview.valid && preview.educational ? `💡 ${preview.educational}` : preview.reason}
            </p>
          )}
        </>
      ) : (
        <p className="text-[10px] text-gray-500 leading-snug">
          Select a solution card to preview cost, impact and risk before applying.
        </p>
      )}

      <div className="mt-2 flex items-center gap-1.5">
        <button
          onClick={onApply}
          disabled={disabled || !preview || !preview.valid || !preview.affordable}
          className={[
            'flex-1 h-8 rounded-lg text-[11px] font-semibold transition-all',
            preview && preview.valid && preview.affordable && !disabled
              ? 'bg-[#10b981] text-gray-900 hover:bg-[#10b981]/90 active:scale-[0.98]'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {!preview
            ? 'Apply Solution'
            : !preview.valid
              ? 'Cannot Apply'
              : !preview.affordable
                ? 'Not Enough Energy'
                : 'Apply Solution'}
        </button>

        <button
          onClick={skipped ? onRevisit : onSkip}
          disabled={disabled || !showSkip}
          className={[
            'h-8 px-3 rounded-lg text-[11px] font-medium border transition-all active:scale-[0.98]',
            skipped
              ? 'border-[#0ea5e9]/40 text-[#38bdf8] hover:bg-[#0ea5e9]/10'
              : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200',
            (!showSkip || disabled) ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {skipped ? '↩ Revisit' : 'Skip'}
        </button>
      </div>
    </div>
  );
}

export default memo(ActionPreview, (prev, next) => {
  if (
    prev.skipped !== next.skipped ||
    prev.hasProblem !== next.hasProblem ||
    prev.canAct !== next.canAct ||
    prev.disabled !== next.disabled ||
    prev.onApply !== next.onApply ||
    prev.onSkip !== next.onSkip ||
    prev.onRevisit !== next.onRevisit
  ) {
    return false;
  }
  const a = prev.preview;
  const b = next.preview;
  if (!a || !b) return a === b;
  return (
    a.actionType === b.actionType &&
    a.problemId === b.problemId &&
    a.problemName === b.problemName &&
    a.valid === b.valid &&
    a.affordable === b.affordable &&
    a.energyCost === b.energyCost &&
    a.timeCost === b.timeCost &&
    a.expectedImpact === b.expectedImpact &&
    a.risk === b.risk &&
    a.educational === b.educational &&
    a.reason === b.reason
  );
});
