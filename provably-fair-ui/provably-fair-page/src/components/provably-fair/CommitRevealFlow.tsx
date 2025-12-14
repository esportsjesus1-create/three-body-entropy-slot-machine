import { Lock, Unlock, Shuffle, CheckCircle, ArrowRight } from 'lucide-react';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

export function CommitRevealFlow() {
  const steps: Step[] = [
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'House Commits',
      description: 'We generate a secret seed using three-body physics and lock it with a hash before you spin.',
      color: 'text-amber-500',
    },
    {
      icon: <Shuffle className="w-6 h-6" />,
      title: 'You Add Your Seed',
      description: 'You provide your own random seed. Neither party knows the final outcome yet.',
      color: 'text-blue-500',
    },
    {
      icon: <Unlock className="w-6 h-6" />,
      title: 'Seeds Combined',
      description: 'Your seed and our seed are cryptographically mixed to create the final random result.',
      color: 'text-purple-500',
    },
    {
      icon: <CheckCircle className="w-6 h-6" />,
      title: 'Verify Anytime',
      description: 'We reveal our original seed. You can verify we didn\'t change it after seeing your seed.',
      color: 'text-emerald-500',
    },
  ];

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-4 flex-1">
            <div className="flex flex-col items-center text-center flex-1">
              <div
                className={`w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center ${step.color} mb-3`}
              >
                {step.icon}
              </div>
              <h4 className={`font-semibold text-sm mb-1 ${step.color}`}>{step.title}</h4>
              <p className="text-xs text-slate-400 max-w-32">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className="hidden md:flex items-center text-slate-600">
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <details className="group">
          <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors">
            Technical details for crypto enthusiasts
          </summary>
          <div className="mt-3 text-xs text-slate-500 space-y-2 pl-4 border-l-2 border-slate-700">
            <p>
              <strong className="text-slate-400">Commitment:</strong> SHA-256 hash of the house seed is published before you provide your seed.
            </p>
            <p>
              <strong className="text-slate-400">Mixing:</strong> Final entropy = HMAC-SHA256(houseSeed || clientSeed || nonce)
            </p>
            <p>
              <strong className="text-slate-400">Verification:</strong> Hash the revealed house seed and compare with the original commitment.
            </p>
            <p>
              <strong className="text-slate-400">Entropy Source:</strong> Three-body gravitational simulation with Runge-Kutta integration produces chaotic, unpredictable values.
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}
