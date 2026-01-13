'use client';

import { useState, useCallback } from 'react';
import { useBeads, useConvoys, usePolecats } from '@/lib/use-beads';
import { useGtStatus } from '@/lib/use-gt-status';
import { FeatureGate } from '@/lib/project-mode';
import { NavBar } from '@/components/layout';
import type { Convoy, Issue, Polecat } from '@/types/beads';
import Link from 'next/link';

export default function Dashboard() {
  const { data, isLoading: beadsLoading, refresh: refreshBeads } = useBeads();
  const { convoys, isLoading: convoysLoading, refresh: refreshConvoys } = useConvoys();
  const { polecats, isLoading: polecatsLoading } = usePolecats();
  const { status: gtStatus, isLoading: gtLoading } = useGtStatus();

  const isLoading = beadsLoading || convoysLoading || polecatsLoading || gtLoading;

  // Mail modal state
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refresh = useCallback(async () => {
    await Promise.all([refreshBeads(), refreshConvoys()]);
  }, [refreshBeads, refreshConvoys]);

  // Mayor mail handler
  const handleOpenMayorMail = () => {
    setMailSubject('');
    setMailBody('');
    setIsMailModalOpen(true);
  };

  const handleSendMail = async () => {
    if (!mailSubject || !mailBody) {
      setActionStatus({ type: 'error', text: 'Please fill in subject and message' });
      return;
    }

    setIsSendingMail(true);
    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'mayor',
          subject: mailSubject,
          body: mailBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send mail');
      }

      setActionStatus({ type: 'success', text: 'Instructions sent to Mayor' });
      setIsMailModalOpen(false);
      setMailSubject('');
      setMailBody('');
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      setActionStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send mail',
      });
    } finally {
      setIsSendingMail(false);
    }
  };

  // System health calculations
  const deaconAgent = gtStatus?.agents?.find(a => a.name.toLowerCase() === 'deacon');
  const deaconAlive = deaconAgent?.running ?? false;
  const witnesses = data?.witnesses ?? [];
  const refineries = data?.refineries ?? [];
  const activeWitnesses = witnesses.filter(w => w.status === 'active').length;
  const activeRefineries = refineries.filter(r => r.status === 'processing' || r.status === 'active').length;

  // Active work calculations
  const activeConvoys = convoys.filter(c => c.status === 'active' || c.status === 'stalled');
  const issues = data?.issues ?? [];
  const activeIssues = issues.filter(i => i.status === 'in_progress' || i.status === 'hooked');

  // Helper to find which convoy an issue belongs to
  const getConvoyForIssue = (issueId: string) => {
    return convoys.find(c => c.issues?.includes(issueId));
  };

  // Crew with active work
  const activePolecats = polecats.filter(p => p.status === 'active' && p.hooked_work);

  // System health status
  const systemHealthy = deaconAlive && activeWitnesses > 0;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Command Center</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Give instructions → Watch progress → Get code
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Status Message */}
        {actionStatus && (
          <div className={`mb-4 rounded-md border p-3 ${actionStatus.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400' : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'}`}>
            {actionStatus.text}
          </div>
        )}

        {/* TOP SECTION - Command Input (Mayor) */}
        <FeatureGate feature="mayor">
          <div className="mb-8">
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white p-8 shadow-sm dark:border-purple-900/50 dark:from-purple-950/30 dark:to-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 shadow-md">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Mayor</h2>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Chief-of-staff coordinating all work
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleOpenMayorMail}
                  className="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-lg"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send Instructions
                </button>
              </div>
            </div>
          </div>
        </FeatureGate>

        {/* MIDDLE SECTION - Active Work */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Active Work</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Active Convoys */}
            <FeatureGate feature="convoys">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Work Streams
                    </h3>
                    {!convoysLoading && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        {activeConvoys.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/work"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all →
                  </Link>
                </div>

                {convoysLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="h-5 w-3/4 rounded bg-zinc-300 dark:bg-zinc-700" />
                        <div className="mt-2 h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-600" />
                      </div>
                    ))}
                  </div>
                ) : activeConvoys.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No active work streams</p>
                ) : (
                  <div className="space-y-3">
                    {activeConvoys.map((convoy) => (
                      <Link
                        key={convoy.id}
                        href={`/work?convoy=${convoy.id}`}
                        className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-3 transition-all hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-900/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${convoy.status === 'stalled' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <span className="font-medium text-zinc-900 dark:text-zinc-100">{convoy.title}</span>
                            {convoy.status === 'stalled' && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                Stalled
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                            <span>{convoy.progress.completed} / {convoy.progress.total} completed</span>
                            {convoy.assignee && <span>Assigned: {convoy.assignee}</span>}
                          </div>
                        </div>
                        <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>

            {/* Active Issues */}
            <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    In Progress
                  </h3>
                  {!beadsLoading && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {activeIssues.length}
                    </span>
                  )}
                </div>
                <Link
                  href="/work"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all →
                </Link>
              </div>

              {beadsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="h-4 w-2/3 rounded bg-zinc-300 dark:bg-zinc-700" />
                    </div>
                  ))}
                </div>
              ) : activeIssues.length === 0 ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No issues currently being worked on</p>
              ) : (
                <div className="space-y-2">
                  {activeIssues.slice(0, 5).map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/work?issue=${issue.id}`}
                      className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 transition-all hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/30"
                    >
                      <div className={`h-2 w-2 rounded-full ${issue.status === 'in_progress' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                      <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">{issue.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${issue.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'}`}>
                        {issue.status}
                      </span>
                      <svg className="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  ))}
                  {activeIssues.length > 5 && (
                    <p className="pt-2 text-xs text-zinc-500 dark:text-zinc-500">
                      + {activeIssues.length - 5} more issues
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Active Crew */}
            <FeatureGate feature="crew">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Working Now
                    </h3>
                    {!polecatsLoading && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        {activePolecats.length}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/workers"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all →
                  </Link>
                </div>

                {polecatsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="h-4 w-1/2 rounded bg-zinc-300 dark:bg-zinc-700" />
                      </div>
                    ))}
                  </div>
                ) : activePolecats.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No workers currently active</p>
                ) : (
                  <div className="space-y-2">
                    {activePolecats.map((polecat) => (
                      <div key={polecat.id} className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{polecat.name}</span>
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">on {polecat.rig}</span>
                        {polecat.unread_mail > 0 && (
                          <span className="ml-auto rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                            {polecat.unread_mail} mail
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>
          </div>
        </div>

        {/* BOTTOM SECTION - Engine Health + Output */}
        <div>
          <div className="mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">System Status</h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Engine Health */}
            <FeatureGate feature="deacon">
              <div className={`rounded-xl border p-6 shadow-sm ${systemHealthy ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-zinc-900' : 'border-red-200 bg-gradient-to-br from-red-50 to-white dark:border-red-900/50 dark:from-red-950/30 dark:to-zinc-900'}`}>
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg shadow-md ${systemHealthy ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {systemHealthy ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        )}
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        Engine {systemHealthy ? 'Running' : 'Issues'}
                      </h3>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        System health indicators
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/system"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Engine Room →
                  </Link>
                </div>

                {gtLoading || beadsLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="animate-pulse rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="h-3 w-16 rounded bg-zinc-300 dark:bg-zinc-700" />
                        <div className="mt-2 h-6 w-20 rounded bg-zinc-200 dark:bg-zinc-600" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Deacon</div>
                    <div className={`mt-1 text-lg font-bold ${deaconAlive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {deaconAlive ? 'Running' : 'Stopped'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Witnesses</div>
                    <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {activeWitnesses} / {witnesses.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Refineries</div>
                    <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {activeRefineries} / {refineries.length}
                    </div>
                  </div>
                  <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Workers</div>
                    <div className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {activePolecats.length} active
                    </div>
                  </div>
                </div>
                )}
              </div>
            </FeatureGate>

            {/* Recent Output (Refineries) */}
            <FeatureGate feature="refineries">
              <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                      Refinery Output
                    </h3>
                  </div>
                  <Link
                    href="/system"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View details →
                  </Link>
                </div>

                {beadsLoading ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="h-4 w-1/3 rounded bg-zinc-300 dark:bg-zinc-700" />
                      </div>
                    ))}
                  </div>
                ) : refineries.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">No refineries configured</p>
                ) : (
                  <div className="space-y-2">
                    {refineries.map((refinery) => (
                      <div key={refinery.rig} className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${refinery.status === 'processing' ? 'bg-emerald-500' : refinery.status === 'active' ? 'bg-blue-500' : 'bg-zinc-400'}`} />
                          <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">{refinery.rig}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {refinery.queueDepth > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              {refinery.queueDepth} queued
                            </span>
                          )}
                          {refinery.currentPR && (
                            <span className="text-xs text-zinc-600 dark:text-zinc-400">
                              Processing #{refinery.currentPR.number}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FeatureGate>
          </div>
        </div>
      </main>

      {/* Mayor Mail Modal */}
      {isMailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsMailModalOpen(false)}>
          <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Send Instructions to Mayor</h3>
              <button
                onClick={() => setIsMailModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</label>
                <input
                  type="text"
                  value={mailSubject}
                  onChange={(e) => setMailSubject(e.target.value)}
                  placeholder="What needs to be done?"
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Instructions</label>
                <textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  placeholder="Describe the work, requirements, or questions..."
                  rows={10}
                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsMailModalOpen(false)}
                  disabled={isSendingMail}
                  className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMail}
                  disabled={isSendingMail || !mailSubject || !mailBody}
                  className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSendingMail ? 'Sending...' : 'Send to Mayor'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
