import { useEffect, useRef, useState } from 'react';

interface CinematicTransitionProps {
  screen: string;
  keyValue?: string;
}

/**
 * Short, subtle route transition (target ~320ms). A soft dark veil fades in
 * very briefly while thin accent bars sweep from the edges, then everything
 * clears so the new screen is interactive immediately. It is fully
 * pointer-events-none and never blocks input.
 */
function CinematicTransition({ screen, keyValue }: CinematicTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'enter' | 'exit'>(() => {
    // First mount: play a gentle entrance instead of a full wipe.
    return 'idle';
  });
  const prevRef = useRef(`${screen}:${keyValue ?? ''}`);

  useEffect(() => {
    const key = `${screen}:${keyValue ?? ''}`;
    if (prevRef.current === key) return;
    prevRef.current = key;

    setPhase('enter');
    const revealTimer = setTimeout(() => setPhase('exit'), 120);
    const doneTimer = setTimeout(() => setPhase('idle'), 340);
    return () => {
      clearTimeout(revealTimer);
      clearTimeout(doneTimer);
    };
  }, [screen, keyValue]);

  if (!phase || phase === 'idle') return null;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none overflow-hidden">
      <div className={`cine-veil ${phase === 'exit' ? 'cine-veil-exit' : 'cine-veil-enter'}`} />
      <div className={`cine-bar cine-bar-top ${phase === 'exit' ? 'cine-bar-out' : 'cine-bar-in-top'}`} />
      <div className={`cine-bar cine-bar-bottom ${phase === 'exit' ? 'cine-bar-out' : 'cine-bar-in-bottom'}`} />
    </div>
  );
}

export default CinematicTransition;
