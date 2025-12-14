/**
 * Hash Verification Demo
 * 
 * Demonstrates the hash verification process with PLACEHOLDER data only.
 * Does NOT reveal actual theta values or algorithm details.
 * For marketing/regulatory purposes.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, RefreshCw, Lock, Unlock, Hash } from 'lucide-react';

interface DemoData {
  commitment: string;
  serverSecret: string;
  playerSeed: string;
  combinedHash: string;
  result: string[];
}

function generateDemoData(): DemoData {
  const chars = '0123456789abcdef';
  const randomHex = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * 16)]).join('');
  
  return {
    commitment: randomHex(64),
    serverSecret: randomHex(64),
    playerSeed: randomHex(32),
    combinedHash: randomHex(64),
    result: ['fa', 'zhong', 'wild', 'bai', 'wusuo']
  };
}

export function HashVerificationDemo() {
  const [demoData, setDemoData] = useState<DemoData>(generateDemoData);
  const [step, setStep] = useState<'commit' | 'reveal' | 'verify'>('commit');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const handleNewDemo = () => {
    setDemoData(generateDemoData());
    setStep('commit');
    setVerificationResult(null);
  };

  const handleReveal = () => {
    setStep('reveal');
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setStep('verify');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setVerificationResult(true);
    setIsVerifying(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Interactive demonstration with example values
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewDemo}
          className="border-slate-700 hover:bg-slate-800"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          New Demo
        </Button>
      </div>

      <div className="grid gap-4">
        <Card className={`bg-slate-800/50 border-slate-700 transition-all ${step === 'commit' ? 'ring-2 ring-amber-500/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-200 mb-1">Step 1: Server Commitment</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Server generates a secret and publishes its hash (commitment)
                </p>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-500">Commitment (public):</span>
                    <code className="block text-xs bg-slate-900 p-2 rounded mt-1 text-emerald-400 break-all">
                      {demoData.commitment}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Server Secret:</span>
                    <code className="block text-xs bg-slate-900 p-2 rounded mt-1 text-slate-500 break-all">
                      {step === 'commit' ? '••••••••••••••••••••••••••••••••' : demoData.serverSecret}
                    </code>
                  </div>
                </div>

                {step === 'commit' && (
                  <Button
                    size="sm"
                    onClick={handleReveal}
                    className="mt-3 bg-amber-600 hover:bg-amber-700"
                  >
                    Player Provides Seed
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-slate-800/50 border-slate-700 transition-all ${step === 'reveal' ? 'ring-2 ring-blue-500/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Unlock className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-200 mb-1">Step 2: Reveal & Mix</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Player provides seed, server reveals secret, both are combined
                </p>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-slate-500">Player Seed:</span>
                    <code className="block text-xs bg-slate-900 p-2 rounded mt-1 text-blue-400 break-all">
                      {step !== 'commit' ? demoData.playerSeed : '(waiting for player...)'}
                    </code>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Combined Result:</span>
                    <code className="block text-xs bg-slate-900 p-2 rounded mt-1 text-purple-400 break-all">
                      {step !== 'commit' ? `HMAC(server_secret, player_seed) = ${demoData.combinedHash.slice(0, 32)}...` : '(pending...)'}
                    </code>
                  </div>
                  {step !== 'commit' && (
                    <div>
                      <span className="text-xs text-slate-500">Spin Result:</span>
                      <div className="flex gap-2 mt-1">
                        {demoData.result.map((symbol, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-900 rounded text-xs text-slate-300">
                            {symbol}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {step === 'reveal' && (
                  <Button
                    size="sm"
                    onClick={handleVerify}
                    className="mt-3 bg-blue-600 hover:bg-blue-700"
                  >
                    Verify Fairness
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`bg-slate-800/50 border-slate-700 transition-all ${step === 'verify' ? 'ring-2 ring-emerald-500/50' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-slate-200 mb-1">Step 3: Verification</h4>
                <p className="text-xs text-slate-400 mb-3">
                  Anyone can verify: SHA256(server_secret) must equal the original commitment
                </p>
                
                {step === 'verify' && (
                  <div className="space-y-3">
                    <div className="bg-slate-900 p-3 rounded space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">SHA256(</span>
                        <span className="text-amber-400">{demoData.serverSecret.slice(0, 16)}...</span>
                        <span className="text-slate-500">)</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500">=</span>
                        <span className="text-emerald-400">{demoData.commitment.slice(0, 32)}...</span>
                      </div>
                    </div>

                    {isVerifying ? (
                      <div className="flex items-center gap-2 text-amber-400">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Verifying...</span>
                      </div>
                    ) : verificationResult !== null && (
                      <div className={`flex items-center gap-2 ${verificationResult ? 'text-emerald-400' : 'text-red-400'}`}>
                        {verificationResult ? (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-medium">Verification Passed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-5 h-5" />
                            <span className="font-medium">Verification Failed</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {step !== 'verify' && (
                  <div className="text-xs text-slate-500 italic">
                    Complete steps 1 and 2 to verify...
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <p className="text-xs text-slate-400 text-center">
          <strong className="text-slate-300">Note:</strong> This demonstration uses randomly generated example values. 
          When you play, you can verify your actual spins using the "Verify My Spin" feature.
        </p>
      </div>
    </div>
  );
}
