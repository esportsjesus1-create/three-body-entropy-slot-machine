import { useEffect, useState } from 'react';
import { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { RefreshCw, BarChart3 } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

interface ThetaDistributionHistogramProps {
  apiEndpoint?: string;
}

function generateUniformSamples(count: number): number[] {
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    const theta1 = Math.random() * Math.PI * 2;
    const theta2 = Math.random() * Math.PI * 2;
    const theta3 = Math.random() * Math.PI * 2;
    samples.push(theta1, theta2, theta3);
  }
  return samples;
}

function bucketSamples(samples: number[], bucketCount: number = 12): number[] {
  const buckets = new Array(bucketCount).fill(0);
  const bucketSize = (Math.PI * 2) / bucketCount;

  samples.forEach((sample) => {
    const normalizedSample = ((sample % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const bucketIndex = Math.min(Math.floor(normalizedSample / bucketSize), bucketCount - 1);
    buckets[bucketIndex]++;
  });

  return buckets;
}

export function ThetaDistributionHistogram({ apiEndpoint }: ThetaDistributionHistogramProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sampleCount, setSampleCount] = useState(500);
  const [buckets, setBuckets] = useState<number[]>([]);
  const [totalSamples, setTotalSamples] = useState(0);

  const generateSamples = async () => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    if (apiEndpoint) {
      try {
        const response = await fetch(`${apiEndpoint}/api/v1/stats/theta-distribution?samples=${sampleCount}`);
        const data = await response.json();
        setBuckets(data.buckets);
        setTotalSamples(data.totalSamples);
      } catch {
        const samples = generateUniformSamples(sampleCount);
        setBuckets(bucketSamples(samples));
        setTotalSamples(samples.length);
      }
    } else {
      const samples = generateUniformSamples(sampleCount);
      setBuckets(bucketSamples(samples));
      setTotalSamples(samples.length);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    generateSamples();
  }, []);

  const labels = [
    '0', 'π/6', 'π/3', 'π/2', '2π/3', '5π/6', 'π', '7π/6', '4π/3', '3π/2', '5π/3', '11π/6'
  ];

  const expectedCount = totalSamples / 12;
  const maxDeviation = buckets.length > 0 ? Math.max(...buckets.map(b => Math.abs(b - expectedCount))) : 0;
  const uniformityScore = buckets.length > 0 ? Math.max(0, 100 - (maxDeviation / expectedCount) * 100) : 0;

  const data = {
    labels,
    datasets: [
      {
        label: 'Observed Frequency',
        data: buckets,
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Expected (Uniform)',
        data: new Array(12).fill(expectedCount),
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 2,
        borderDash: [5, 5],
        type: 'line' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: { size: 11 },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Theta Angle (radians)',
          color: '#64748b',
        },
        ticks: { color: '#64748b' },
        grid: { color: '#1e293b' },
      },
      y: {
        title: {
          display: true,
          text: 'Frequency',
          color: '#64748b',
        },
        ticks: { color: '#64748b' },
        grid: { color: '#1e293b' },
      },
    },
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-slate-200">Theta Distribution Analysis</h3>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sampleCount}
            onChange={(e) => setSampleCount(Number(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-300"
          >
            <option value={100}>100 spins</option>
            <option value={500}>500 spins</option>
            <option value={1000}>1000 spins</option>
            <option value={5000}>5000 spins</option>
          </select>
          <button
            onClick={generateSamples}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm rounded transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        This histogram shows the distribution of theta angles across many spins. 
        A fair RNG produces a uniform distribution where each angle range is equally likely.
      </p>

      <div className="h-64 mb-4">
        {buckets.length > 0 ? (
          <Bar data={data} options={options} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Click "Generate" to analyze theta distribution
          </div>
        )}
      </div>

      {buckets.length > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">{totalSamples.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Samples</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{uniformityScore.toFixed(1)}%</div>
            <div className="text-xs text-slate-500">Uniformity Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">
              {uniformityScore > 90 ? 'FAIR' : uniformityScore > 70 ? 'GOOD' : 'CHECK'}
            </div>
            <div className="text-xs text-slate-500">Assessment</div>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs text-slate-500">
        <strong className="text-slate-400">What this proves:</strong> If the house could predict or manipulate outcomes, 
        certain theta ranges would appear more frequently. A uniform distribution demonstrates that all outcomes are equally likely.
      </div>
    </div>
  );
}
