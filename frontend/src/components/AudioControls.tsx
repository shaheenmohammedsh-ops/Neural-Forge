import { memo } from 'react';

interface AudioControlsProps {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  onToggleMusic: () => void;
  onToggleSfx: () => void;
}

function AudioControls({ musicEnabled, sfxEnabled, onToggleMusic, onToggleSfx }: AudioControlsProps) {
  const playClickSound = (window as any).playClickSound;

  const handleMusic = () => {
    if (playClickSound) playClickSound();
    onToggleMusic();
  };

  const handleSfx = () => {
    if (playClickSound) playClickSound();
    onToggleSfx();
  };

  return (
    <div className="fixed top-3 right-3 z-[70] flex items-center gap-1.5">
      <button
        onClick={handleMusic}
        aria-pressed={musicEnabled}
        title={musicEnabled ? 'Mute music' : 'Enable music'}
        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
          musicEnabled
            ? 'border-[#0ea5e9]/50 bg-[#0ea5e9]/15 text-[#38bdf8]'
            : 'border-gray-700 bg-gray-900/70 text-gray-500'
        }`}
      >
        <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {musicEnabled ? (
            <>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm-9-13l12-3" />
            </>
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          )}
        </svg>
      </button>

      <button
        onClick={handleSfx}
        aria-pressed={sfxEnabled}
        title={sfxEnabled ? 'Mute sound effects' : 'Enable sound effects'}
        className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
          sfxEnabled
            ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/15 text-[#a78bfa]'
            : 'border-gray-700 bg-gray-900/70 text-gray-500'
        }`}
      >
        <svg className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {sfxEnabled ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5L6 9H2v6h4l5 4V5zM22 9l-6 6m0-6l6 6" />
          )}
        </svg>
      </button>
    </div>
  );
}

export default memo(AudioControls);
