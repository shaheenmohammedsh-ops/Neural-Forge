import React, { useCallback, useEffect, useRef, useState } from 'react';

interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: string;
  animation: string;
}

interface ScreenEffect {
  id: number;
  type: 'shake' | 'flash-success' | 'flash-danger' | 'combo';
  intensity: number;
}

interface VisualFeedbackProps {
  children: React.ReactNode;
}

const VisualFeedback: React.FC<VisualFeedbackProps> = ({ children }) => {
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [screenEffects, setScreenEffects] = useState<ScreenEffect[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const nextIdRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);

  const scheduleCleanup = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      fn();
      timeoutsRef.current = timeoutsRef.current.filter((t) => t !== id);
    }, delay);
    timeoutsRef.current.push(id);
  }, []);

  const showFloatingText = useCallback(
    (
      x: number,
      y: number,
      text: string,
      color: string = 'text-cyan-400',
      size: string = 'text-lg',
      animation: string = 'float-up'
    ) => {
      const id = ++nextIdRef.current;
      setFloatingTexts((prev) => [...prev, { id, x, y, text, color, size, animation }]);
      scheduleCleanup(() => {
        setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
      }, 1500);
    },
    [scheduleCleanup]
  );

  const triggerScreenShake = useCallback(
    (intensity: number = 1) => {
      const id = ++nextIdRef.current;
      setScreenEffects((prev) => [...prev, { id, type: 'shake', intensity }]);
      scheduleCleanup(() => {
        setScreenEffects((prev) => prev.filter((item) => item.id !== id));
      }, 500);
    },
    [scheduleCleanup]
  );

  const triggerFlash = useCallback(
    (type: 'success' | 'danger') => {
      const id = ++nextIdRef.current;
      setScreenEffects((prev) => [
        ...prev,
        { id, type: type === 'success' ? 'flash-success' : 'flash-danger', intensity: 1 },
      ]);
      scheduleCleanup(() => {
        setScreenEffects((prev) => prev.filter((item) => item.id !== id));
      }, 500);
    },
    [scheduleCleanup]
  );

  const showCombo = useCallback(
    (count: number) => {
      setComboCount(count);
      const id = ++nextIdRef.current;
      setScreenEffects((prev) => [...prev, { id, type: 'combo', intensity: count }]);
      scheduleCleanup(() => {
        setScreenEffects((prev) => prev.filter((item) => item.id !== id));
        setComboCount(0);
      }, 2000);
    },
    [scheduleCleanup]
  );

  useEffect(() => {
    (window as any).showFloatingText = showFloatingText;
    (window as any).triggerScreenShake = triggerScreenShake;
    (window as any).triggerFlash = triggerFlash;
    (window as any).showCombo = showCombo;

    return () => {
      delete (window as any).showFloatingText;
      delete (window as any).triggerScreenShake;
      delete (window as any).triggerFlash;
      delete (window as any).showCombo;
      timeoutsRef.current.forEach((t) => window.clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, [showFloatingText, triggerScreenShake, triggerFlash, showCombo]);

  // Capture shake once so it doesn't re-randomize on every render.
  const shakeRef = useRef<{ animation: string; transform: string } | null>(null);
  if (screenEffects.some((e) => e.type === 'shake')) {
    if (!shakeRef.current) {
      const intensity = screenEffects.find((e) => e.type === 'shake')?.intensity ?? 1;
      const offset = 5 * intensity;
      shakeRef.current = {
        animation: 'shake 0.5s ease-in-out',
        transform: `translate(${Math.random() * offset - offset / 2}px, ${Math.random() * offset - offset / 2}px)`,
      };
    }
  } else {
    shakeRef.current = null;
  }

  const flashClass = screenEffects.find((e) => e.type.startsWith('flash'))?.type ?? '';
  const showComboDisplay = comboCount > 1;

  return (
    <div className={`relative ${flashClass}`} style={shakeRef.current ?? undefined}>
      {children}

      {showComboDisplay && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 animate-pulse-glow">
            {comboCount}x COMBO!
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingTexts.map((item) => (
          <div
            key={item.id}
            className={`absolute font-bold ${item.color} ${item.size} ${item.animation}`}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              textShadow: '0 0 10px currentColor, 0 0 20px currentColor',
            }}
          >
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(VisualFeedback);
