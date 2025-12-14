/**
 * Provably Fair UI - Two-Tier Model
 * 
 * PUBLIC FRONT PAGE (marketing/regulators):
 * - Hash verification demo with placeholder data
 * - Three-body orbit animation
 * - Commit-reveal flow visualization
 * - NO theta values or distributions exposed
 * 
 * PLAYER VERIFICATION (authenticated players only):
 * - Actual theta values for their spins
 * - Spin history with verification data
 * - Download verification data
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, Orbit, Hash, Lock, User, ExternalLink } from 'lucide-react';
import {
  ThreeBodyOrbitAnimation,
  CommitRevealFlow,
  HashChainTimeline,
  HashVerificationDemo,
  PlayerVerificationPage,
} from '@/components/provably-fair';

const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '';

type ViewMode = 'public' | 'player';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('public');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Provably Fair</h1>
                <p className="text-xs text-slate-400">Three-Body Entropy RNG</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'public' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('public')}
                className={viewMode === 'public' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-slate-700'}
              >
                <Shield className="w-4 h-4 mr-2" />
                How It Works
              </Button>
              <Button
                variant={viewMode === 'player' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('player')}
                className={viewMode === 'player' ? 'bg-blue-600 hover:bg-blue-700' : 'border-slate-700'}
              >
                <User className="w-4 h-4 mr-2" />
                Verify My Spins
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {viewMode === 'public' ? (
          <PublicFrontPage onSwitchToPlayer={() => setViewMode('player')} />
        ) : (
          <PlayerVerificationSection apiEndpoint={API_ENDPOINT} />
        )}
      </main>

      <footer className="border-t border-slate-800 mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          <p>Three-Body Entropy RNG - Provably Fair Gaming</p>
          <p className="mt-2">
            Built with cryptographic commitments, hash chains, and chaotic physics simulation.
          </p>
        </div>
      </footer>
    </div>
  );
}

function PublicFrontPage({ onSwitchToPlayer }: { onSwitchToPlayer: () => void }) {
  return (
    <>
      <section className="mb-12">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
            How We Guarantee Fair Play
          </h2>
          <p className="text-slate-400 text-lg">
            Our slot machine uses a revolutionary three-body physics simulation to generate 
            truly unpredictable random numbers. Combined with cryptographic commitments, 
            every spin is verifiably fair.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-2">
                <Orbit className="w-6 h-6 text-amber-500" />
              </div>
              <CardTitle className="text-lg">Chaotic Physics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Three celestial bodies orbit each other in mathematically chaotic patterns. 
                Tiny changes create completely different outcomes.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-2">
                <Hash className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-lg">Cryptographic Proof</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                We commit to our random seed before you spin. You add your own seed. 
                Neither party can predict or manipulate the outcome.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-2">
                <Lock className="w-6 h-6 text-emerald-500" />
              </div>
              <CardTitle className="text-lg">Independently Verifiable</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                After each spin, you receive all the data needed to verify the result 
                yourself. No trust required - verify everything.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      <Tabs defaultValue="physics" className="max-w-5xl mx-auto">
        <TabsList className="grid w-full grid-cols-3 bg-slate-900 border border-slate-800">
          <TabsTrigger value="physics" className="data-[state=active]:bg-slate-800">
            <Orbit className="w-4 h-4 mr-2" />
            Physics
          </TabsTrigger>
          <TabsTrigger value="verification" className="data-[state=active]:bg-slate-800">
            <Shield className="w-4 h-4 mr-2" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="chain" className="data-[state=active]:bg-slate-800">
            <Hash className="w-4 h-4 mr-2" />
            Hash Chain
          </TabsTrigger>
        </TabsList>

        <TabsContent value="physics" className="mt-6">
          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Orbit className="w-5 h-5 text-amber-500" />
                Three-Body Simulation
              </CardTitle>
              <CardDescription>
                Watch three celestial bodies interact through gravity. Their chaotic motion 
                is mathematically unpredictable, making it perfect for random number generation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThreeBodyOrbitAnimation />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>Why Three-Body Physics?</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-400 space-y-4">
              <p>
                The three-body problem is one of the most famous unsolved problems in physics. 
                When three objects interact through gravity, their motion becomes chaotic and 
                fundamentally unpredictable over time.
              </p>
              <p>
                We use a high-precision Runge-Kutta (RK4) numerical integrator to simulate 
                these gravitational interactions. The simulation runs for thousands of timesteps, 
                amplifying tiny differences in initial conditions into completely different outcomes.
              </p>
              <p>
                This chaos is not a bug—it's a feature. It means that even with perfect knowledge 
                of the starting conditions, predicting the final state is computationally infeasible. 
                This makes our RNG truly unpredictable.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verification" className="mt-6">
          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-500" />
                Hash Verification Demo
              </CardTitle>
              <CardDescription>
                See how cryptographic verification works. This demo uses example values 
                to show the commit-reveal process.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HashVerificationDemo />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-500" />
                Commit-Reveal Protocol
              </CardTitle>
              <CardDescription>
                Our fairness guarantee comes from a cryptographic commitment scheme. 
                Neither the house nor the player can manipulate the outcome.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommitRevealFlow />
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">Why This Works</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-400 space-y-3 text-sm">
                <p>
                  <strong className="text-slate-200">Before you spin:</strong> We generate our 
                  random seed using three-body physics and publish a hash (commitment) of it. 
                  This hash is like a sealed envelope—we can't change what's inside.
                </p>
                <p>
                  <strong className="text-slate-200">When you spin:</strong> You provide your 
                  own seed. We can't predict what you'll choose, and you can't see our seed yet.
                </p>
                <p>
                  <strong className="text-slate-200">After the spin:</strong> We reveal our 
                  original seed. You can verify it matches the commitment hash. The final 
                  result comes from mixing both seeds together.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg">Security Guarantees</CardTitle>
              </CardHeader>
              <CardContent className="text-slate-400 space-y-3 text-sm">
                <p>
                  <strong className="text-emerald-400">House can't cheat:</strong> The commitment 
                  is published before your seed. Changing the house seed would produce a different 
                  hash, which you can detect.
                </p>
                <p>
                  <strong className="text-emerald-400">Player can't cheat:</strong> Your seed 
                  is combined with ours using HMAC-SHA256. You can't reverse-engineer a seed 
                  that produces a specific outcome.
                </p>
                <p>
                  <strong className="text-emerald-400">Fully auditable:</strong> Every spin's 
                  seeds, commitments, and results are stored. Anyone can verify any spin at any time.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chain" className="mt-6">
          <Card className="bg-slate-900 border-slate-800 mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="w-5 h-5 text-purple-500" />
                Hash Chain Verification
              </CardTitle>
              <CardDescription>
                Every spin is linked to the previous one through cryptographic hashes, 
                creating an unbreakable chain of verifiable results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HashChainTimeline />
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle>How Hash Chains Prevent Tampering</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-400 space-y-4">
              <p>
                A hash chain is like a blockchain for your spins. Each spin's hash is computed 
                using the previous spin's hash, your seed, and a nonce. This creates a chain 
                where every link depends on all previous links.
              </p>
              <p>
                If we tried to change any past spin, it would change that spin's hash. But 
                the next spin's hash depends on the previous one, so it would also change. 
                This cascade effect means tampering with any spin would break the entire chain 
                from that point forward.
              </p>
              <p>
                You can verify the chain at any time by starting from the first spin and 
                recomputing each hash. If all hashes match, the chain is intact and no 
                tampering has occurred.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <section className="mt-12 max-w-3xl mx-auto text-center">
        <Card className="bg-gradient-to-br from-blue-900/50 to-emerald-900/50 border-slate-700">
          <CardContent className="p-8">
            <User className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Verify Your Own Spins</h3>
            <p className="text-slate-400 mb-6">
              After playing, you can verify your actual spins with complete transparency. 
              View your personal entropy data and download verification files.
            </p>
            <Button 
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                onSwitchToPlayer();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Go to Player Verification
            </Button>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function PlayerVerificationSection({ apiEndpoint }: { apiEndpoint: string }) {
  return (
    <>
      <section className="mb-8">
        <div className="max-w-3xl mx-auto text-center mb-8">
          <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Verify Your Spins
          </h2>
          <p className="text-slate-400 text-lg">
            Enter your spin session ID to view complete verification data including 
            your personal theta angles and cryptographic proof.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto">
        <PlayerVerificationPage apiEndpoint={apiEndpoint} />
      </div>
    </>
  );
}

export default App
