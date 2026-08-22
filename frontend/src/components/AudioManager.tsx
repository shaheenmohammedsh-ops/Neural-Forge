import { useEffect, useRef, useCallback } from 'react';

interface AudioManagerProps {
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

interface MusicNodes {
  gain: GainNode;
  oscs: OscillatorNode[];
  lfo: OscillatorNode;
}

const SOUND_DEFS: Record<string, { frequency: number; duration: number; type: OscillatorType }> = {
  click: { frequency: 1200, duration: 0.05, type: 'sine' },
  success: { frequency: 880, duration: 0.2, type: 'sine' },
  warning: { frequency: 440, duration: 0.3, type: 'sawtooth' },
  error: { frequency: 220, duration: 0.35, type: 'square' },
  combo: { frequency: 1047, duration: 0.15, type: 'sine' },
  complete: { frequency: 1175, duration: 0.5, type: 'triangle' },
  threat: { frequency: 330, duration: 0.35, type: 'sawtooth' },
  'low-energy': { frequency: 262, duration: 0.25, type: 'square' },
  progress: { frequency: 740, duration: 0.2, type: 'triangle' },
};

/**
 * Single shared AudioContext for BOTH music and SFX. One context is created on
 * the first user interaction and reused for the lifetime of the app, so
 * navigating between screens never spawns duplicate contexts or audio nodes.
 * Music and SFX mutes are fully independent: SFX mute stops click/success
 * tones only; music mute ramps the music pad to silence (and back) without
 * touching the shared context.
 */
const AudioManager: React.FC<AudioManagerProps> = ({ musicEnabled, sfxEnabled }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const musicNodesRef = useRef<MusicNodes | null>(null);
  const sfxEnabledRef = useRef(sfxEnabled);

  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled;
  }, [sfxEnabled]);

  const getContext = useCallback(async (): Promise<AudioContext | null> => {
    if (audioContextRef.current) {
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (e) {
          console.warn('Failed to resume AudioContext:', e);
        }
      }
      return audioContextRef.current;
    }

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      console.warn('Web Audio API not supported');
      return null;
    }

    try {
      const context = new AudioContextCtor();
      await context.resume();
      audioContextRef.current = context;
      return context;
    } catch (e) {
      console.warn('Failed to initialize AudioContext:', e);
      return null;
    }
  }, []);

  const playClickSound = useCallback(async () => {
    if (!sfxEnabledRef.current) return;
    const context = await getContext();
    if (!context || context.state === 'closed') return;
    const def = SOUND_DEFS.click;
    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.type = def.type;
      oscillator.frequency.setValueAtTime(1200, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, context.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.05);
    } catch (e) {
      console.warn('Failed to play click sound:', e);
    }
  }, [getContext]);

  const playSound = useCallback(
    async (type: keyof typeof SOUND_DEFS) => {
      if (!sfxEnabledRef.current) return;
      const context = await getContext();
      if (!context || context.state === 'closed') return;
      const sound = SOUND_DEFS[type] || SOUND_DEFS.success;
      try {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        oscillator.type = sound.type;
        oscillator.frequency.setValueAtTime(sound.frequency, context.currentTime);
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + sound.duration);
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + sound.duration);
      } catch (e) {
        console.warn('Failed to play sound:', e);
      }
    },
    [getContext]
  );

  const startMusic = useCallback(async () => {
    if (musicNodesRef.current) return; // already playing - never duplicate
    const context = await getContext();
    if (!context || context.state === 'closed') return;

    try {
      const gainNode = context.createGain();
      const filterNode = context.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.frequency.setValueAtTime(320, context.currentTime);
      filterNode.Q.setValueAtTime(1, context.currentTime);

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.setValueAtTime(0.06, context.currentTime);
      lfoGain.gain.setValueAtTime(120, context.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filterNode.frequency);
      lfo.start(context.currentTime);

      const voices: Array<{ freq: number; type: OscillatorType; gain: number }> = [
        { freq: 55, type: 'sine', gain: 1.0 },
        { freq: 82.5, type: 'sine', gain: 0.6 },
        { freq: 110, type: 'triangle', gain: 0.25 },
        { freq: 164.81, type: 'triangle', gain: 0.12 },
      ];

      const oscs: OscillatorNode[] = [];
      voices.forEach((voice) => {
        const osc = context.createOscillator();
        const oscGain = context.createGain();
        osc.type = voice.type;
        osc.frequency.setValueAtTime(voice.freq, context.currentTime);
        oscGain.gain.setValueAtTime(voice.gain, context.currentTime);
        osc.connect(oscGain);
        oscGain.connect(filterNode);
        osc.start(context.currentTime);
        oscs.push(osc);
      });

      filterNode.connect(gainNode);
      gainNode.connect(context.destination);
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.035, context.currentTime + 3);

      musicNodesRef.current = { gain: gainNode, oscs, lfo };
    } catch (e) {
      console.warn('Failed to start background music:', e);
    }
  }, [getContext]);

  const stopMusic = useCallback(() => {
    const nodes = musicNodesRef.current;
    const context = audioContextRef.current;
    if (!nodes) return;
    if (context && context.state !== 'closed') {
      try {
        nodes.gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.6);
      } catch {
        /* ignore */
      }
    }
    // Stop oscillators shortly after the fade to avoid clicks.
    const stopAt = window.setTimeout(() => {
      try {
        nodes.oscs.forEach((o) => o.stop());
        nodes.lfo.stop();
        nodes.gain.disconnect();
      } catch {
        /* ignore */
      }
      if (musicNodesRef.current === nodes) musicNodesRef.current = null;
    }, 650);
    window.setTimeout(() => window.clearTimeout(stopAt), 700);
  }, []);

  // Initialize the shared context on the first user interaction.
  useEffect(() => {
    const handleUserInteraction = () => {
      getContext();
    };
    const events = ['click', 'keydown', 'touchstart', 'mousedown'];
    events.forEach((event) => {
      window.addEventListener(event, handleUserInteraction, { once: true, passive: true });
    });
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, [getContext]);

  // Music starts/stops only when the user toggles it (never on navigation).
  useEffect(() => {
    if (musicEnabled) {
      startMusic();
    } else {
      stopMusic();
    }
  }, [musicEnabled, startMusic, stopMusic]);

  // Single cleanup on full app teardown.
  useEffect(() => {
    return () => {
      const nodes = musicNodesRef.current;
      if (nodes) {
        try {
          nodes.oscs.forEach((o) => o.stop());
          nodes.lfo.stop();
        } catch {
          /* ignore */
        }
        musicNodesRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => undefined);
        audioContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    (window as any).playSound = playSound;
    (window as any).playClickSound = playClickSound;
    (window as any).initAudio = getContext;
    return () => {
      delete (window as any).playSound;
      delete (window as any).playClickSound;
      delete (window as any).initAudio;
    };
  }, [playSound, playClickSound, getContext]);

  return null;
};

export default AudioManager;
