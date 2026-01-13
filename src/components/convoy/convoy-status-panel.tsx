'use client';

import Link from 'next/link';
import { useBeads } from '@/lib/use-beads';
import { cn } from '@/lib/utils';

export function ConvoyStatusPanel() {
  const { data, isLoading } = useBeads();

  const convoys = data?.convoys ?? [];
  const issues = data?.issues ?? [];

  // Calculate stats
  const totalCount = convoys.length;
  const activeCount = convoys.filter(c => c.status === 'active').length;
  const stalledCount = convoys.filter(c => c.status === 'stalled').length;
  const completedCount = convoys.filter(c => c.status === 'completed').length;

  // Get important convoys to highlight
  const stalledConvoys = convoys.filter(c => c.status === 'stalled');
  const blockedConvoys = convoys.filter(c => {
    const convoyIssues = c.issues.map(id => issues.find(i => i.id === id)).filter(Boolean);
    return convoyIssues.some(i => i?.status === 'blocked');
  });
  const almostDoneConvoys = convoys.filter(c => {
    if (c.progress.total === 0) return false;
    const percent = (c.progress.completed / c.progress.total) * 100;
    return percent >= 80 && percent < 100 && c.status === 'active';
  });
  const recentlyCompletedConvoys = convoys
    .filter(c => c.status === 'completed')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 3);

  // Combine important convoys (dedupe and prioritize)
  const importantConvoys = [
    ...stalledConvoys,
    ...blockedConvoys.filter(c => !stalledConvoys.includes(c)),
    ...almostDoneConvoys.filter(c => !stalledConvoys.includes(c) && !blockedConvoys.includes(c)),
    ...recentlyCompletedConvoys.filter(c => !stalledConvoys.includes(c) && !blockedConvoys.includes(c) && !almostDoneConvoys.includes(c))
  ].slice(0, 5);  // Show max 5 important convoys

  // Helper to get full issue details from convoy issue IDs
  const getConvoyIssues = (convoyIssueIds: string[]) => {
    return convoyIssueIds
      .map(id => issues.find(issue => issue.id === id))
      .filter((issue): issue is NonNullable<typeof issue> => issue != null);
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Convoys
        </h3>
        {stalledCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
            {stalledCount} stalled
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="text-center">
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</div>
          <div className="text-xs text-zinc-500">Total</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{activeCount}</div>
          <div className="text-xs text-zinc-500">Active</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{stalledCount}</div>
          <div className="text-xs text-zinc-500">Stalled</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-zinc-600 dark:text-zinc-400">{completedCount}</div>
          <div className="text-xs text-zinc-500">Done</div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500">Loading...</div>
      ) : importantConvoys.length === 0 ? (
        <div className="text-xs text-zinc-500">No convoys requiring attention</div>
      ) : (
        <div>
          <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Important Convoys</div>
          <div className="space-y-2">
          {importantConvoys.map((convoy) => {
            const convoyIssues = getConvoyIssues(convoy.issues || []);
            const inProgressIssues = convoyIssues.filter(i => i.status === 'in_progress' || i.status === 'hooked');
            const blockedIssues = convoyIssues.filter(i => i.status === 'blocked');
            const percent = convoy.progress.total > 0 ? Math.round((convoy.progress.completed / convoy.progress.total) * 100) : 0;

            return (
              <Link
                key={convoy.id}
                href="/work"
                className="block rounded bg-zinc-50 dark:bg-zinc-800/50 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      convoy.status === 'active' ? 'bg-green-500' :
                      convoy.status === 'stalled' ? 'bg-amber-500' :
                      'bg-zinc-500'
                    )}
                  />
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 flex-1">
                    {convoy.title}
                  </div>
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{percent}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 ml-4">
                  <span>{convoy.progress.completed}/{convoy.progress.total}</span>
                  {blockedIssues.length > 0 && (
                    <span className="text-red-600 dark:text-red-400 font-medium">• {blockedIssues.length} blocked</span>
                  )}
                  {convoy.status === 'stalled' && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">• stalled</span>
                  )}
                  {percent >= 80 && percent < 100 && convoy.status === 'active' && (
                    <span className="text-green-600 dark:text-green-400 font-medium">• almost done</span>
                  )}
                  {convoy.status === 'completed' && (
                    <span className="text-zinc-500 dark:text-zinc-400">• completed</span>
                  )}
                </div>
              </Link>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
