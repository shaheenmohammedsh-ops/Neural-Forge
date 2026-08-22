import { useEffect, useRef } from 'react';

interface Node {
  x: number;
  y: number;
  phase: number;
  hue: 'cyan' | 'violet';
}

interface Connection {
  from: Node;
  to: Node;
}

interface Signal {
  connectionIndex: number;
  progress: number;
}

interface Pulse {
  x: number;
  y: number;
  radius: number;
  alpha: number;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const LAYERS = [4, 6, 4];

function LandingNeuralVisualization() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    if (!ctx || !parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let nodes: Node[] = [];
    let connections: Connection[] = [];
    let signals: Signal[] = [];
    let pulses: Pulse[] = [];

    // ---- Graph layout (rebuilt on resize so nothing is ever clipped) ----
    const build = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(120, rect.width);
      const height = Math.max(160, rect.height);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const padX = 26;
      const padY = 34;
      const maxCount = Math.max(...LAYERS);
      const layerSpacing = Math.min(150, (width - padX * 2) / (LAYERS.length - 1));
      const nodeSpacing = Math.min(64, (height - padY * 2) / (maxCount - 1));
      const startX = (width - (LAYERS.length - 1) * layerSpacing) / 2;
      const startY = (height - (maxCount - 1) * nodeSpacing) / 2;

      nodes = [];
      LAYERS.forEach((count, li) => {
        const topOffset = ((maxCount - count) * nodeSpacing) / 2;
        for (let i = 0; i < count; i++) {
          nodes.push({
            x: startX + li * layerSpacing,
            y: startY + topOffset + i * nodeSpacing,
            phase: Math.random() * Math.PI * 2,
            hue: li === 1 ? (i % 3 === 0 ? 'violet' : 'cyan') : 'cyan',
          });
        }
      });

      connections = [];
      let offset = 0;
      LAYERS.forEach((count, li) => {
        for (let i = 0; i < count; i++) {
          const from = nodes[offset + i];
          for (let j = 0; j < LAYERS[li + 1]; j++) {
            const to = nodes[offset + count + j];
            if (from && to) connections.push({ from, to });
          }
        }
        offset += count;
      });

      signals = connections.map((_, idx) => ({
        connectionIndex: idx,
        progress: Math.random() > 0.72 ? Math.random() : -1,
      }));
      pulses = [];
    };

    build();
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            build();
            if (prefersReducedMotion()) draw();
          })
        : null;
    ro?.observe(parent);

    // ---- Rendering ----
    const nodeColor = (n: Node, alpha: number) =>
      n.hue === 'violet' ? `rgba(167, 139, 250, ${alpha})` : `rgba(14, 165, 233, ${alpha})`;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < connections.length; i++) {
        const { from, to } = connections[i];
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        grad.addColorStop(0, 'rgba(14, 165, 233, 0.16)');
        grad.addColorStop(1, 'rgba(124, 58, 237, 0.14)');
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.stroke();

        const signal = signals[i];
        if (signal && signal.progress >= 0 && signal.progress < 1) {
          const sx = from.x + (to.x - from.x) * signal.progress;
          const sy = from.y + (to.y - from.y) * signal.progress;
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
          glow.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
          glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
          ctx.beginPath();
          ctx.arc(sx, sy, 10, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(224, 242, 254, 0.95)';
          ctx.fill();
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const t = performance.now();
        const breathe = Math.sin(t * 0.002 + node.phase) * 0.18 + 0.82;
        const radius = 5 * breathe + 0.5;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
        const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 14);
        halo.addColorStop(0, nodeColor(node, 0.25 * breathe));
        halo.addColorStop(1, nodeColor(node, 0));
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor(node, 0.95);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        p.radius += 1.4;
        p.alpha -= 0.025;
        if (p.alpha <= 0) pulses.splice(i, 1);
      }
    };

    const advance = (dt: number) => {
      const speed = dt * 0.01 * 60;
      for (let i = 0; i < signals.length; i++) {
        const s = signals[i];
        if (s.progress >= 0 && s.progress < 1) {
          s.progress += speed;
          if (s.progress >= 1) s.progress = -1;
        } else if (s.progress === -1 && Math.random() > 0.995) {
          s.progress = 0;
        }
      }
      if (nodes.length && Math.random() > 0.985) {
        const n = nodes[Math.floor(Math.random() * nodes.length)];
        pulses.push({ x: n.x, y: n.y, radius: 6, alpha: 0.5 });
      }
    };

    if (prefersReducedMotion()) {
      draw();
      return () => ro?.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      advance(dt);
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ minHeight: '260px' }}
      aria-hidden
    />
  );
}

export default LandingNeuralVisualization;
