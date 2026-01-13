'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Refinery } from '@/types/beads';
import { RefineryCard } from './refinery-card';

interface RefineriesPanelProps {
  onProcessQueue?: (refinery: Refinery) => Promise<void>;
}

export function RefineriesPanel({ onProcessQueue }: RefineriesPanelProps) {
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRefineries = useCallback(async () => {
    try {
      const response = await fetch('/api/beads/refineries');
      if (!response.ok) {
        throw new Error('Failed to fetch refineries');
      }
      const data = await response.json();
      setRefineries(data.refineries);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRefineries();

    // Poll every 10 seconds
    const interval = setInterval(fetchRefineries, 10000);
    return () => clearInterval(interval);
  }, [fetchRefineries]);

  const handleProcess = async (refinery: Refinery) => {
    if (processing) return;

    setProcessing(refinery.rig);

    try {
      if (onProcessQueue) {
        await onProcessQueue(refinery);
      } else {
        // Default: call the API
        const response = await fetch('/api/beads/refineries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rig: refinery.rig, action: 'process' }),
        });

        if (!response.ok) {
          throw new Error('Failed to process queue');
        }
      }

      // Refresh data after processing
      await fetchRefineries();
    } catch (err) {
      console.error('Error processing queue:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleViewQueue = (refinery: Refinery) => {
    // Open GitHub PRs page in new tab
    if (refinery.currentPR) {
      // Extract repo URL from PR URL
      const repoUrl = refinery.currentPR.url.replace(/\/pull\/\d+$/, '/pulls');
      window.open(repoUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 shadow-sm dark:shadow-none">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-zinc-500 dark:text-gray-400">Loading refineries...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 shadow-sm dark:shadow-none">
        <div className="text-red-600 dark:text-red-400">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={fetchRefineries}
          className="mt-2 px-3 py-1 text-sm rounded bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (refineries.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-gray-800 bg-white dark:bg-gray-900/30 p-6 text-center shadow-sm dark:shadow-none">
        <p className="text-zinc-500 dark:text-gray-500">No refineries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Refineries</h2>
        <button
          onClick={fetchRefineries}
          className="px-2 py-1 text-xs rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-zinc-700 dark:text-gray-300"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {refineries.map((refinery) => (
          <RefineryCard
            key={refinery.id}
            refinery={
              processing === refinery.rig
                ? { ...refinery, status: 'processing' }
                : refinery
            }
            onProcess={handleProcess}
            onViewQueue={handleViewQueue}
          />
        ))}
      </div>
    </div>
  );
}
