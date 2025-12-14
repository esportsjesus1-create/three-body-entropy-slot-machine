import { useEffect, useRef } from 'react';

interface ThetaAnglesVisualizationProps {
  theta1?: number;
  theta2?: number;
  theta3?: number;
  animated?: boolean;
}

export function ThetaAnglesVisualization({
  theta1 = 0.7,
  theta2 = 2.3,
  theta3 = 4.8,
  animated = true,
}: ThetaAnglesVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = 50;
    const spacing = 130;
    const startX = 65;
    const centerY = height / 2;

    const colors = ['#f59e0b', '#3b82f6', '#10b981'];
    const labels = ['θ₁', 'θ₂', 'θ₃'];
    const thetas = [theta1, theta2, theta3];

    function draw() {
      if (!ctx) return;

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, width, height);

      thetas.forEach((theta, i) => {
        const centerX = startX + i * spacing;
        const currentTheta = animated ? theta + offsetRef.current * (i + 1) * 0.1 : theta;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = colors[i] + '40';
        ctx.lineWidth = 2;
        ctx.stroke();

        for (let j = 0; j < 12; j++) {
          const tickAngle = (j * Math.PI * 2) / 12;
          const innerR = radius - 5;
          const outerR = radius;
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(tickAngle) * innerR,
            centerY + Math.sin(tickAngle) * innerR
          );
          ctx.lineTo(
            centerX + Math.cos(tickAngle) * outerR,
            centerY + Math.sin(tickAngle) * outerR
          );
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = colors[i] + '20';
        ctx.lineWidth = 1;
        ctx.stroke();

        const dotX = centerX + Math.cos(currentTheta) * radius;
        const dotY = centerY + Math.sin(currentTheta) * radius;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(dotX, dotY);
        ctx.strokeStyle = colors[i] + '80';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(dotX, dotY, 8, 0, Math.PI * 2);
        ctx.fillStyle = colors[i];
        ctx.fill();

        ctx.beginPath();
        ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
        ctx.strokeStyle = colors[i] + '60';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#64748b';
        ctx.fill();

        ctx.font = 'bold 16px system-ui';
        ctx.fillStyle = colors[i];
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], centerX, centerY + radius + 30);

        const normalizedTheta = ((currentTheta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const degrees = Math.round((normalizedTheta * 180) / Math.PI);
        ctx.font = '12px system-ui';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${degrees}°`, centerX, centerY + radius + 48);
      });

      ctx.font = '11px system-ui';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'left';
      ctx.fillText('0', startX + radius + 5, centerY + 4);
      ctx.fillText('π/2', startX - 4, centerY - radius - 8);
      ctx.fillText('π', startX - radius - 15, centerY + 4);
      ctx.fillText('3π/2', startX - 10, centerY + radius + 18);
    }

    function animate() {
      if (animated) {
        offsetRef.current += 0.02;
      }
      draw();
      animationRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [theta1, theta2, theta3, animated]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={400}
        height={180}
        className="rounded-lg border border-slate-700 bg-slate-900"
      />
      <div className="mt-2 text-center text-xs text-slate-500">
        Each angle represents a body's position in phase space (0 to 2π radians)
      </div>
    </div>
  );
}
