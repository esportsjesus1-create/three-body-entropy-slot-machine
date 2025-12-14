/**
 * Player Verification Page
 * 
 * Player-specific verification page that shows ACTUAL theta values
 * and allows players to verify their own spins.
 * This component should only be accessible to authenticated players
 * or via deep-link with session ID.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  Search, 
  History, 
  Shield,
  Lock,
  Trash2
} from 'lucide-react';

interface SpinVerificationData {
  sessionId: string;
  commitment: string;
  houseSeed: string;
  clientSeed: string;
  thetaAngles: number[];
  result: {
    symbols: string[];
    positions: number[];
    winAmount: number;
    multiplier: number;
  };
  proof: {
    entropyHex: string;
    combinedSeedHash: string;
    verificationHash: string;
  };
  createdAt: string;
  revealedAt: string;
  verified: boolean;
}

interface PlayerVerificationPageProps {
  apiEndpoint: string;
}

export function PlayerVerificationPage({ apiEndpoint }: PlayerVerificationPageProps) {
  const [sessionId, setSessionId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationData, setVerificationData] = useState<SpinVerificationData | null>(null);
  const [spinHistory, setSpinHistory] = useState<SpinVerificationData[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('mySpinHistory');
    if (saved) {
      try {
        setSpinHistory(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }

    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('sessionId');
    if (urlSessionId) {
      setSessionId(urlSessionId);
      handleVerify(urlSessionId);
    }
  }, []);

  const handleVerify = async (id?: string) => {
    const targetId = id || sessionId;
    if (!targetId.trim()) {
      setError('Please enter a session ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiEndpoint}/api/v1/verify/${targetId}`);
      
      if (!response.ok) {
        throw new Error('Spin not found or verification failed');
      }

      const data = await response.json();
      
      const spinData: SpinVerificationData = {
        sessionId: targetId,
        commitment: data.spin.commitment,
        houseSeed: data.spin.houseSeed,
        clientSeed: data.spin.clientSeed,
        thetaAngles: data.spin.proof?.thetaAngles || [],
        result: data.spin.result,
        proof: data.spin.proof,
        createdAt: data.spin.createdAt,
        revealedAt: data.spin.revealedAt,
        verified: data.valid
      };

      setVerificationData(spinData);

      const existingIndex = spinHistory.findIndex(s => s.sessionId === targetId);
      let newHistory: SpinVerificationData[];
      if (existingIndex >= 0) {
        newHistory = [...spinHistory];
        newHistory[existingIndex] = spinData;
      } else {
        newHistory = [spinData, ...spinHistory].slice(0, 50);
      }
      setSpinHistory(newHistory);
      localStorage.setItem('mySpinHistory', JSON.stringify(newHistory));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setVerificationData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!verificationData) return;

    const downloadData = {
      sessionId: verificationData.sessionId,
      commitment: verificationData.commitment,
      houseSeed: verificationData.houseSeed,
      clientSeed: verificationData.clientSeed,
      thetaAngles: verificationData.thetaAngles,
      result: verificationData.result,
      proof: verificationData.proof,
      timestamps: {
        created: verificationData.createdAt,
        revealed: verificationData.revealedAt
      },
      verificationCode: `
// JavaScript verification code
const crypto = require('crypto');

const houseSeed = '${verificationData.houseSeed}';
const clientSeed = '${verificationData.clientSeed}';
const commitment = '${verificationData.commitment}';

// Step 1: Verify commitment
const computedCommitment = crypto.createHash('sha256').update(houseSeed).digest('hex');
console.log('Commitment valid:', computedCommitment === commitment);

// Step 2: Verify combined seed
const combinedSeed = crypto.createHmac('sha256', houseSeed).update(clientSeed).digest('hex');
console.log('Combined seed:', combinedSeed);

// Step 3: Theta angles used
const thetaAngles = ${JSON.stringify(verificationData.thetaAngles)};
console.log('Theta angles (radians):', thetaAngles);
console.log('Theta angles (degrees):', thetaAngles.map(t => (t * 180 / Math.PI).toFixed(2)));
`
    };

    const blob = new Blob([JSON.stringify(downloadData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spin-verification-${verificationData.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    setSpinHistory([]);
    localStorage.removeItem('mySpinHistory');
  };

  const formatTheta = (theta: number) => {
    const degrees = (theta * 180 / Math.PI).toFixed(2);
    const radians = theta.toFixed(4);
    return { degrees, radians };
  };

  return (
    <div className="space-y-8">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-500" />
            Verify Your Spin
          </CardTitle>
          <CardDescription>
            Enter your spin session ID to view the complete verification data including theta angles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="sessionId" className="sr-only">Session ID</Label>
              <Input
                id="sessionId"
                placeholder="Enter your spin session ID..."
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="bg-slate-800 border-slate-700"
              />
            </div>
            <Button
              onClick={() => handleVerify()}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {verificationData && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {verificationData.verified ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                Verification Result
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="border-slate-700 hover:bg-slate-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Data
              </Button>
            </div>
            <CardDescription>
              Session: {verificationData.sessionId}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={`p-4 rounded-lg ${verificationData.verified ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2">
                {verificationData.verified ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <span className="font-medium text-emerald-400">This spin is verified as fair</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-red-400">Verification failed</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                Your Theta Angles
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {verificationData.thetaAngles.map((theta, i) => {
                  const { degrees, radians } = formatTheta(theta);
                  return (
                    <div key={i} className="bg-slate-800 rounded-lg p-4 text-center">
                      <div className="text-xs text-slate-500 mb-1">Theta {i + 1} (θ{i + 1})</div>
                      <div className="text-2xl font-bold text-amber-400">{degrees}°</div>
                      <div className="text-xs text-slate-500 mt-1">{radians} rad</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3">Spin Result</h4>
              <div className="flex gap-2">
                {verificationData.result.symbols.map((symbol, i) => (
                  <div key={i} className="bg-slate-800 rounded-lg px-4 py-3 text-center">
                    <div className="text-lg font-medium text-slate-200">{symbol}</div>
                    <div className="text-xs text-slate-500">Pos {verificationData.result.positions[i]}</div>
                  </div>
                ))}
              </div>
              {verificationData.result.winAmount > 0 && (
                <div className="mt-3 text-emerald-400">
                  Win: {verificationData.result.winAmount} (x{verificationData.result.multiplier})
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-500" />
                Cryptographic Data
              </h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Commitment:</span>
                  <code className="block bg-slate-800 p-2 rounded mt-1 text-emerald-400 break-all">
                    {verificationData.commitment}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500">House Seed:</span>
                  <code className="block bg-slate-800 p-2 rounded mt-1 text-amber-400 break-all">
                    {verificationData.houseSeed}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500">Your Seed:</span>
                  <code className="block bg-slate-800 p-2 rounded mt-1 text-blue-400 break-all">
                    {verificationData.clientSeed}
                  </code>
                </div>
                <div>
                  <span className="text-slate-500">Combined Entropy:</span>
                  <code className="block bg-slate-800 p-2 rounded mt-1 text-purple-400 break-all">
                    {verificationData.proof.entropyHex}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2">How to Verify Independently</h4>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Compute SHA256(house_seed) - should equal commitment</li>
                <li>Compute HMAC-SHA256(house_seed, your_seed) - produces combined entropy</li>
                <li>The theta angles determine reel positions via the three-body algorithm</li>
                <li>Download the verification data to run your own verification script</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      )}

      {spinHistory.length > 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-500" />
                Your Spin History
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-slate-500 hover:text-red-400"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear
              </Button>
            </div>
            <CardDescription>
              Spins you've verified (stored locally in your browser)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {spinHistory.slice(0, 10).map((spin) => (
                <div
                  key={spin.sessionId}
                  className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors"
                  onClick={() => {
                    setSessionId(spin.sessionId);
                    setVerificationData(spin);
                  }}
                >
                  <div className="flex items-center gap-3">
                    {spin.verified ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <div className="text-sm text-slate-300 font-mono">
                        {spin.sessionId.slice(0, 16)}...
                      </div>
                      <div className="text-xs text-slate-500">
                        {new Date(spin.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {spin.result.symbols.map((s, i) => (
                      <span key={i} className="text-xs bg-slate-700 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
        <p className="text-xs text-amber-400 text-center">
          <strong>Privacy Notice:</strong> This page shows your personal spin data including theta angles. 
          Do not share your session ID or this page if you don't want others to see your private verification data.
        </p>
      </div>
    </div>
  );
}
