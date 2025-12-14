import { useState } from 'react';
import { Shield, CheckCircle, XCircle, Copy, ExternalLink, Loader2 } from 'lucide-react';

interface SpinProof {
  sessionId: string;
  commitment: string;
  houseSeed: string;
  clientSeed: string;
  nonce: number;
  entropyHex: string;
  thetaAngles: {
    theta1: number;
    theta2: number;
    theta3: number;
  };
  result: {
    symbols: string[];
    positions: number[];
  };
  timestamp: string;
  verified: boolean;
}

interface VerifySpinModalProps {
  apiEndpoint?: string;
  currentSessionId?: string;
}

const mockProof: SpinProof = {
  sessionId: 'sess_abc123def456',
  commitment: 'a7f3e2c9d1b5f8a4e6c3b7d9f2a8e5c1b4d7f9a2e6c8b3d5f7a1e4c6b9d2f8a3',
  houseSeed: '3b7c9e1f6a4d8b2e5c7f9a3d6b8e1c4f7a9d2b5e8c1f4a7d9b3e6c8f2a5d7b1',
  clientSeed: 'user_seed_12345',
  nonce: 42,
  entropyHex: 'f2e8a19c3d7b5f1a8e4c6b9d2f7a3e5c8b1d4f6a9e2c5b7d1f3a6e8c4b2d9f5',
  thetaAngles: {
    theta1: 1.234,
    theta2: 3.456,
    theta3: 5.678,
  },
  result: {
    symbols: ['wild', 'bonus', 'fa', 'zhong', 'bai'],
    positions: [3, 7, 12, 18, 24],
  },
  timestamp: new Date().toISOString(),
  verified: true,
};

export function VerifySpinModal({ apiEndpoint, currentSessionId }: VerifySpinModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proof, setProof] = useState<SpinProof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionIdInput, setSessionIdInput] = useState(currentSessionId || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const verifyCurrentSpin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (apiEndpoint && sessionIdInput) {
        const response = await fetch(`${apiEndpoint}/api/v1/verify/${sessionIdInput}`);
        if (!response.ok) throw new Error('Failed to fetch verification data');
        const data = await response.json();
        setProof(data);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setProof({ ...mockProof, sessionId: sessionIdInput || mockProof.sessionId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 hover:bg-slate-700 rounded transition-colors"
      title="Copy to clipboard"
    >
      {copiedField === field ? (
        <CheckCircle className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4 text-slate-500" />
      )}
    </button>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
      >
        <Shield className="w-5 h-5" />
        Verify This Spin
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-emerald-500" />
                  <h2 className="text-xl font-bold text-slate-100">Spin Verification</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <label className="block text-sm text-slate-400 mb-2">Session ID</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sessionIdInput}
                    onChange={(e) => setSessionIdInput(e.target.value)}
                    placeholder="Enter session ID to verify"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={verifyCurrentSpin}
                    disabled={isLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Shield className="w-4 h-4" />
                    )}
                    Verify
                  </button>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {proof && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="text-emerald-400 font-medium">
                      {proof.verified ? 'Spin Verified Successfully' : 'Verification Pending'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Commitment Hash</span>
                        <CopyButton text={proof.commitment} field="commitment" />
                      </div>
                      <code className="text-xs text-amber-400 font-mono break-all">{proof.commitment}</code>
                      <p className="text-xs text-slate-500 mt-2">
                        This hash was published before you provided your seed
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">House Seed (Revealed)</span>
                        <CopyButton text={proof.houseSeed} field="houseSeed" />
                      </div>
                      <code className="text-xs text-blue-400 font-mono break-all">{proof.houseSeed}</code>
                      <p className="text-xs text-slate-500 mt-2">
                        Hash this seed to verify it matches the commitment above
                      </p>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Your Seed</span>
                        <CopyButton text={proof.clientSeed} field="clientSeed" />
                      </div>
                      <code className="text-xs text-purple-400 font-mono">{proof.clientSeed}</code>
                      <span className="text-xs text-slate-500 ml-2">Nonce: {proof.nonce}</span>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">Final Entropy</span>
                        <CopyButton text={proof.entropyHex} field="entropy" />
                      </div>
                      <code className="text-xs text-emerald-400 font-mono break-all">{proof.entropyHex}</code>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Theta Angles</span>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-lg font-bold text-amber-400">
                            {proof.thetaAngles.theta1.toFixed(4)}
                          </div>
                          <div className="text-xs text-slate-500">θ₁</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-400">
                            {proof.thetaAngles.theta2.toFixed(4)}
                          </div>
                          <div className="text-xs text-slate-500">θ₂</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-400">
                            {proof.thetaAngles.theta3.toFixed(4)}
                          </div>
                          <div className="text-xs text-slate-500">θ₃</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-lg p-4">
                      <span className="text-xs text-slate-500 uppercase tracking-wide block mb-2">Spin Result</span>
                      <div className="flex gap-2 justify-center">
                        {proof.result.symbols.map((symbol, i) => (
                          <div
                            key={i}
                            className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-xs font-bold text-slate-200 uppercase"
                          >
                            {symbol.slice(0, 2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <a
                      href="#"
                      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View verification guide
                    </a>
                  </div>
                </div>
              )}

              {!proof && !isLoading && (
                <div className="text-center py-8 text-slate-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Enter a session ID and click Verify to see the cryptographic proof</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
