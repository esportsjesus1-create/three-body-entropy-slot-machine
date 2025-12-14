import { Link2, ArrowRight } from 'lucide-react';

interface HashNode {
  spinNumber: number;
  hash: string;
  timestamp: string;
}

interface HashChainTimelineProps {
  nodes?: HashNode[];
}

const defaultNodes: HashNode[] = [
  { spinNumber: 1, hash: 'a7f3e2...8b4c', timestamp: '10:23:15' },
  { spinNumber: 2, hash: 'c9d1b5...2e7a', timestamp: '10:23:42' },
  { spinNumber: 3, hash: 'f2e8a1...9c3d', timestamp: '10:24:01' },
  { spinNumber: 4, hash: '3b7c9e...1f6a', timestamp: '10:24:18' },
  { spinNumber: 5, hash: '8d4f2a...5e9b', timestamp: '10:24:35' },
];

export function HashChainTimeline({ nodes = defaultNodes }: HashChainTimelineProps) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-slate-200">Hash Chain Verification</h3>
      </div>

      <p className="text-sm text-slate-400 mb-6">
        Each spin's hash is derived from the previous one, creating an unbreakable chain. 
        Tampering with any spin would break all subsequent hashes.
      </p>

      <div className="relative">
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/20 via-purple-500/40 to-purple-500/20" />

        <div className="flex justify-between items-start relative">
          {nodes.map((node, index) => (
            <div key={index} className="flex flex-col items-center relative z-10">
              <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-purple-500/50 flex items-center justify-center mb-2 hover:border-purple-500 hover:bg-slate-700 transition-all cursor-pointer group">
                <span className="text-sm font-bold text-purple-400 group-hover:text-purple-300">
                  #{node.spinNumber}
                </span>
              </div>

              <div className="text-center">
                <code className="text-xs text-slate-500 font-mono block mb-1">
                  {node.hash}
                </code>
                <span className="text-xs text-slate-600">{node.timestamp}</span>
              </div>

              {index < nodes.length - 1 && (
                <div className="absolute top-5 left-full -translate-x-1/2 text-purple-500/50">
                  <ArrowRight className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-800">
        <div className="flex items-start gap-3 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-purple-500 mt-1 flex-shrink-0" />
          <p>
            <strong className="text-slate-400">How it works:</strong> Each hash is computed as 
            H(previous_hash || client_seed || nonce). To verify, start from the first hash and 
            recompute each subsequent hash. If any hash doesn't match, the chain has been tampered with.
          </p>
        </div>
      </div>

      <details className="mt-4 group">
        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-300 transition-colors">
          View full hash values
        </summary>
        <div className="mt-3 space-y-2 bg-slate-800/50 rounded-lg p-3">
          {nodes.map((node, index) => (
            <div key={index} className="flex items-center gap-2 text-xs font-mono">
              <span className="text-purple-400 w-8">#{node.spinNumber}</span>
              <span className="text-slate-500">
                {node.hash.replace('...', '').padEnd(16, '0').slice(0, 8)}...
                {node.hash.replace('...', '').padEnd(16, '0').slice(-8)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
