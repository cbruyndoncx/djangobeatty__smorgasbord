'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Polecat {
  name: string;
  rig: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
}

interface Witness {
  rig: string;
  status: 'active' | 'idle' | 'stopped';
}

interface SystemStatus {
  refineries: {
    total: number;
    withWork: number;
  };
  deacon: {
    alive: boolean;
  };
  witnesses: Witness[];
  polecats: Polecat[];
}

export function SystemStatusGrid() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionPending, setActionPending] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      // Fetch from both APIs
      const [gtResponse, beadsResponse] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/beads'),
      ]);

      const gtData = await gtResponse.json();
      const beadsData = await beadsResponse.json();

      let refineryCount = 0;
      let refineryWithWork = 0;
      const witnesses: Witness[] = [];
      const polecats: Polecat[] = [];

      // Check deacon status from top-level agents
      const deaconAgent = gtData.agents?.find(
        (agent: any) => agent.role === 'health-check' || agent.name === 'deacon' || agent.role === 'deacon'
      );
      const deaconAlive = deaconAgent?.running ?? false;

      // Count from gt status
      if (gtData.rigs) {
        for (const rig of gtData.rigs) {
          if (rig.has_refinery) refineryCount++;

          if (rig.agents) {
            for (const agent of rig.agents) {
              if (agent.role === 'witness') {
                witnesses.push({
                  rig: rig.name,
                  status: agent.running && agent.has_work ? 'active' : agent.running ? 'idle' : 'stopped',
                });
              }
              if (agent.role === 'polecat') {
                polecats.push({
                  name: agent.name,
                  rig: rig.name,
                  running: agent.running,
                  has_work: agent.has_work,
                  unread_mail: agent.unread_mail || 0,
                });
              }
              if (agent.role === 'refinery' && agent.has_work) {
                refineryWithWork++;
              }
            }
          }
        }
      }

      setStatus({
        refineries: {
          total: refineryCount,
          withWork: refineryWithWork,
        },
        deacon: {
          alive: deaconAlive,
        },
        witnesses,
        polecats,
      });
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleRestartDeacon = async () => {
    setActionPending('deacon');
    try {
      await fetch('/api/deacon/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      console.error('Failed to restart deacon:', err);
    } finally {
      setActionPending(null);
    }
  };

  const handleNudgeWitness = async (rig: string) => {
    setActionPending(`witness-${rig}`);
    try {
      await fetch('/api/witness/nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      console.error('Failed to nudge witness:', err);
    } finally {
      setActionPending(null);
    }
  };

  const handleStartWitness = async (rig: string) => {
    setActionPending(`witness-${rig}`);
    try {
      await fetch('/api/witness/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });
      setTimeout(fetchStatus, 1000);
    } catch (err) {
      console.error('Failed to start witness:', err);
    } finally {
      setActionPending(null);
    }
  };

  if (isLoading && !status) {
    return null;
  }

  if (!status) {
    return null;
  }

  const activeWitnesses = status.witnesses.filter((w) => w.status === 'active').length;
  const stoppedWitnesses = status.witnesses.filter((w) => w.status === 'stopped');
  const activePolecats = status.polecats.filter((p) => p.running && p.has_work).length;
  const idlePolecats = status.polecats.filter((p) => p.running && !p.has_work);
  const polecatsWithMail = status.polecats.filter((p) => p.unread_mail > 0);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
        System Status
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Deacon */}
        <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Deacon</span>
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  status.deacon.alive ? 'bg-green-500' : 'bg-red-500'
                )}
              />
            </div>
            {!status.deacon.alive && (
              <button
                onClick={handleRestartDeacon}
                disabled={actionPending === 'deacon'}
                className="px-2 py-0.5 text-xs rounded bg-green-900/50 hover:bg-green-800/50 text-green-300 transition-colors disabled:opacity-50"
              >
                Restart
              </button>
            )}
          </div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {status.deacon.alive ? 'OK' : 'Down'}
          </div>
        </div>

      </div>

      {/* Witnesses - Full List Always Visible */}
      <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-zinc-500">Patrols</span>
          {activeWitnesses > 0 && (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          )}
          <span className="text-xs text-zinc-500">({activeWitnesses}/{status.witnesses.length} active)</span>
        </div>

        {status.witnesses.length === 0 ? (
          <div className="text-xs text-zinc-500">No witnesses configured</div>
        ) : (
          <div className="space-y-1">
            {status.witnesses.map((witness) => (
              <div
                key={witness.rig}
                className="flex items-center justify-between p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      witness.status === 'active' ? 'bg-blue-500' :
                      witness.status === 'idle' ? 'bg-zinc-500' :
                      'bg-red-500'
                    )}
                  />
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{witness.rig}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs',
                      witness.status === 'active' ? 'bg-blue-500/20 text-blue-400' :
                      witness.status === 'idle' ? 'bg-zinc-500/20 text-zinc-400' :
                      'bg-red-500/20 text-red-400'
                    )}
                  >
                    {witness.status}
                  </span>
                </div>
                {witness.status === 'stopped' && (
                  <button
                    onClick={() => handleStartWitness(witness.rig)}
                    disabled={actionPending === `witness-${witness.rig}`}
                    className="px-2 py-1 rounded bg-green-900/50 hover:bg-green-800/50 text-green-300 transition-colors disabled:opacity-50"
                  >
                    Start
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Workers - Full List Always Visible */}
      <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-zinc-500">Workers</span>
          {activePolecats > 0 && (
            <span className="w-2 h-2 rounded-full bg-green-500" />
          )}
          <span className="text-xs text-zinc-500">({activePolecats}/{status.polecats.length} active)</span>
        </div>

        {status.polecats.length === 0 ? (
          <div className="text-xs text-zinc-500">No polecats configured</div>
        ) : (
          <div className="space-y-1">
            {status.polecats.map((polecat) => (
              <div
                key={`${polecat.rig}-${polecat.name}`}
                className="flex items-center justify-between p-2 rounded bg-zinc-100 dark:bg-zinc-800 text-xs"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      polecat.running && polecat.has_work ? 'bg-green-500' :
                      polecat.running ? 'bg-blue-500' :
                      'bg-zinc-500'
                    )}
                  />
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{polecat.name}</span>
                  <span className="text-zinc-500">({polecat.rig})</span>
                  {polecat.unread_mail > 0 && (
                    <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
                      {polecat.unread_mail}
                    </span>
                  )}
                </div>
                <div className="text-zinc-500 flex-shrink-0">
                  {polecat.running && polecat.has_work ? 'Working' :
                   polecat.running ? 'Idle' :
                   'Stopped'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
