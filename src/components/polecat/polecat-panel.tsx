'use client';

import { usePolecats } from '@/lib/use-beads';
import { cn } from '@/lib/utils';

export function PolecatPanel() {
  const { polecats, isLoading, error } = usePolecats();

  // Summary stats
  const activeCount = polecats.filter((p) => p.status === 'active').length;
  const idleCount = polecats.filter((p) => p.status === 'idle').length;
  const errorCount = polecats.filter((p) => p.status === 'error').length;

  // Group polecats by rig
  const polecatsByRig = polecats.reduce((acc, polecat) => {
    if (!acc[polecat.rig]) {
      acc[polecat.rig] = [];
    }
    acc[polecat.rig].push(polecat);
    return acc;
  }, {} as Record<string, typeof polecats>);

  if (isLoading && polecats.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <span className="text-zinc-500">Loading workers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 shadow-sm">
        <div className="text-red-600 dark:text-red-400">
          <strong>Error:</strong> {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Active Workers (Polecats)
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
              {activeCount} active
            </span>
            <span className="px-2 py-0.5 rounded bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
              {idleCount} idle
            </span>
            {errorCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                {errorCount} error
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Polecats by Rig */}
      {polecats.length === 0 ? (
        <p className="text-center text-zinc-500 py-4">No workers found</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(polecatsByRig).map(([rigName, rigPolecats]) => (
            <div key={rigName}>
              <h4 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-2">
                {rigName}
              </h4>
              <div className="space-y-2">
                {rigPolecats.map((polecat) => (
                  <div
                    key={polecat.id}
                    className="flex items-center justify-between p-3 rounded bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          polecat.status === 'active' ? 'bg-green-500' :
                          polecat.status === 'idle' ? 'bg-zinc-500' :
                          polecat.status === 'spawning' ? 'bg-yellow-500 animate-pulse' :
                          polecat.status === 'error' ? 'bg-red-500' :
                          'bg-zinc-400'
                        )}
                      />
                      <span className="font-mono text-sm text-zinc-900 dark:text-zinc-100">
                        {polecat.name}
                      </span>
                      {polecat.hooked_work && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                          working on {polecat.hooked_work}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      'text-xs',
                      polecat.status === 'active' ? 'text-green-400' :
                      polecat.status === 'idle' ? 'text-zinc-500' :
                      polecat.status === 'error' ? 'text-red-400' :
                      'text-zinc-400'
                    )}>
                      {polecat.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View All Link */}
      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <a
          href="/polecats"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all workers →
        </a>
      </div>
    </div>
  );
}
