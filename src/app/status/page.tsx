'use client';

import { useGtStatus } from '@/lib/use-gt-status';
import { useFeature } from '@/lib/project-mode';
import { NavBar } from '@/components/layout';
import { cn } from '@/lib/utils';
import type { GtAgent, AgentRole } from '@/types/gt-status';

const roleConfig: Record<AgentRole, { label: string; color: string; bgClass: string; borderClass: string }> = {
  mayor: {
    label: 'Mayor',
    color: 'text-purple-600 dark:text-purple-400',
    bgClass: 'bg-purple-100 dark:bg-purple-500/20',
    borderClass: 'border-purple-300 dark:border-purple-500/30',
  },
  deacon: {
    label: 'Deacon',
    color: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-500/20',
    borderClass: 'border-blue-300 dark:border-blue-500/30',
  },
  witness: {
    label: 'Witness',
    color: 'text-green-600 dark:text-green-400',
    bgClass: 'bg-green-100 dark:bg-green-500/20',
    borderClass: 'border-green-300 dark:border-green-500/30',
  },
  polecat: {
    label: 'Polecat',
    color: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-100 dark:bg-orange-500/20',
    borderClass: 'border-orange-300 dark:border-orange-500/30',
  },
  crew: {
    label: 'Crew',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgClass: 'bg-cyan-100 dark:bg-cyan-500/20',
    borderClass: 'border-cyan-300 dark:border-cyan-500/30',
  },
  unknown: {
    label: 'Unknown',
    color: 'text-zinc-600 dark:text-zinc-400',
    bgClass: 'bg-zinc-100 dark:bg-zinc-500/20',
    borderClass: 'border-zinc-300 dark:border-zinc-500/30',
  },
};

function getAgentRole(agent: GtAgent): AgentRole {
  const name = agent.name.toLowerCase();
  if (name === 'mayor') return 'mayor';
  if (name === 'deacon') return 'deacon';
  if (name.includes('witness') || agent.role === 'witness') return 'witness';
  if (agent.role === 'polecat' || name.includes('polecat')) return 'polecat';
  if (agent.role === 'crew') return 'crew';
  return 'unknown';
}

interface AgentCardProps {
  agent: GtAgent;
}

function AgentCard({ agent }: AgentCardProps) {
  const role = getAgentRole(agent);
  const config = roleConfig[role];

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all shadow-sm dark:shadow-none',
        'bg-white dark:bg-gray-900/50',
        agent.running
          ? config.borderClass
          : 'border-zinc-200 dark:border-gray-700 opacity-60'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-white">{agent.name}</h3>
          <p className="text-xs text-zinc-500 dark:text-gray-500 font-mono truncate max-w-[200px]">
            {agent.address}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
              config.bgClass,
              config.color,
              config.borderClass
            )}
          >
            {config.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              agent.running
                ? 'bg-green-500 dark:bg-green-400 animate-pulse'
                : 'bg-zinc-400 dark:bg-gray-500'
            )}
          />
          <span className={agent.running ? 'text-green-600 dark:text-green-400' : 'text-zinc-500'}>
            {agent.running ? 'Running' : 'Stopped'}
          </span>
        </span>

        {agent.has_work && (
          <span className="text-orange-600 dark:text-orange-400">
            Working
          </span>
        )}

        {agent.unread_mail > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-500/30">
            {agent.unread_mail} mail
          </span>
        )}
      </div>

      {agent.first_subject && (
        <p className="mt-2 text-xs text-zinc-600 dark:text-gray-400 truncate">
          {agent.first_subject}
        </p>
      )}

      {agent.session && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-gray-500 font-mono truncate">
          Session: {agent.session}
        </p>
      )}
    </div>
  );
}

export default function StatusPage() {
  const hasStatus = useFeature('controlPlane');
  const { status, summary, isLoading, error, refresh } = useGtStatus();

  // Feature not available in current mode
  if (!hasStatus) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Status Not Available
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              System status is only available in Gas Town mode.
              This project is running in beads-only mode.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const agents = status?.agents ?? [];

  // Group agents by role
  const groupedAgents = agents.reduce((acc, agent) => {
    const role = getAgentRole(agent);
    if (!acc[role]) acc[role] = [];
    acc[role].push(agent);
    return acc;
  }, {} as Record<AgentRole, GtAgent[]>);

  // Order for display
  const roleOrder: AgentRole[] = ['mayor', 'deacon', 'witness', 'polecat', 'crew', 'unknown'];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Gas Town Status
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Live view of all Gas Town agents
            </p>
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="px-4 py-2 text-sm rounded-md bg-zinc-100 dark:bg-gray-800 hover:bg-zinc-200 dark:hover:bg-gray-700 text-zinc-700 dark:text-gray-300 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-4 shadow-sm dark:shadow-none">
              <p className="text-sm text-zinc-500 dark:text-gray-500">Total Agents</p>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{summary.totalAgents}</p>
            </div>
            <div className="rounded-lg border border-green-300 dark:border-green-500/30 bg-white dark:bg-gray-900/50 p-4 shadow-sm dark:shadow-none">
              <p className="text-sm text-zinc-500 dark:text-gray-500">Running</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.runningAgents}</p>
            </div>
            <div className="rounded-lg border border-orange-300 dark:border-orange-500/30 bg-white dark:bg-gray-900/50 p-4 shadow-sm dark:shadow-none">
              <p className="text-sm text-zinc-500 dark:text-gray-500">Working</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.agentsWithWork}</p>
            </div>
            <div className="rounded-lg border border-yellow-300 dark:border-yellow-500/30 bg-white dark:bg-gray-900/50 p-4 shadow-sm dark:shadow-none">
              <p className="text-sm text-zinc-500 dark:text-gray-500">Unread Mail</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.totalUnreadMail}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {isLoading && !status && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading status...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <p className="text-red-600 dark:text-red-400">Error loading status: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && agents.length === 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-8 text-center shadow-sm dark:shadow-none">
            <p className="text-zinc-500">No agents found. Is Gas Town running?</p>
          </div>
        )}

        {/* Agent Groups */}
        {!isLoading && !error && agents.length > 0 && (
          <div className="space-y-8">
            {roleOrder.map((role) => {
              const roleAgents = groupedAgents[role];
              if (!roleAgents || roleAgents.length === 0) return null;

              const config = roleConfig[role];
              return (
                <div key={role}>
                  <h3 className={cn('text-lg font-semibold mb-4', config.color)}>
                    {config.label}s ({roleAgents.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roleAgents.map((agent) => (
                      <AgentCard key={agent.address} agent={agent} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
