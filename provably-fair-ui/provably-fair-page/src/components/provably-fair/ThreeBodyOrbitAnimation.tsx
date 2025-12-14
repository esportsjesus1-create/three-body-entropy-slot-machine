import { useEffect, useRef, useState } from 'react';

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  trail: { x: number; y: number }[];
}

const G = 0.5;
const SOFTENING = 10;
const DT = 0.02;
const TRAIL_LENGTH = 100;

export function ThreeBodyOrbitAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const bodies: Body[] = [
      {
        x: centerX - 80,
        y: centerY,
        vx: 0,
        vy: -1.5,
        mass: 100,
        color: '#f59e0b',
        trail: [],
      },
      {
        x: centerX + 80,
        y: centerY - 40,
        vx: 0.5,
        vy: 1.2,
        mass: 80,
        color: '#3b82f6',
        trail: [],
      },
      {
        x: centerX + 20,
        y: centerY + 60,
        vx: -0.5,
        vy: 0.3,
        mass: 60,
        color: '#10b981',
        trail: [],
      },
    ];

    function computeAcceleration(bodies: Body[], index: number) {
      let ax = 0;
      let ay = 0;
      const body = bodies[index];

      for (let i = 0; i < bodies.length; i++) {
        if (i === index) continue;
        const other = bodies[i];
        const dx = other.x - body.x;
        const dy = other.y - body.y;
        const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
        const dist = Math.sqrt(distSq);
        const force = (G * other.mass) / distSq;
        ax += force * (dx / dist);
        ay += force * (dy / dist);
      }

      return { ax, ay };
    }

    function updateBodies() {
      const accelerations = bodies.map((_, i) => computeAcceleration(bodies, i));

      bodies.forEach((body, i) => {
        body.vx += accelerations[i].ax * DT;
        body.vy += accelerations[i].ay * DT;
        body.x += body.vx * DT;
        body.y += body.vy * DT;

        body.trail.push({ x: body.x, y: body.y });
        if (body.trail.length > TRAIL_LENGTH) {
          body.trail.shift();
        }
      });
    }

    function draw() {
      if (!ctx) return;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.15)';
      ctx.fillRect(0, 0, width, height);

      bodies.forEach((body) => {
        if (body.trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(body.trail[0].x, body.trail[0].y);
          for (let i = 1; i < body.trail.length; i++) {
            ctx.lineTo(body.trail[i].x, body.trail[i].y);
          }
          ctx.strokeStyle = body.color + '60';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(body.x, body.y, Math.sqrt(body.mass) / 2, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(body.x, body.y, Math.sqrt(body.mass) / 2 + 3, 0, Math.PI * 2);
        ctx.strokeStyle = body.color + '40';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    function animate() {
      if (isRunning) {
        updateBodies();
        draw();
      }
      animationRef.current = requestAnimationFrame(animate);
    }

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isRunning]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        className="rounded-lg border border-slate-700 bg-slate-900"
      />
      <button
        onClick={() => setIsRunning(!isRunning)}
        className="absolute bottom-2 right-2 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md transition-colors"
      >
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <div className="absolute top-2 left-2 flex gap-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-400">Body 1</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-slate-400">Body 2</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-xs text-slate-400">Body 3</span>
        </div>
      </div>
    </div>
  );
}
