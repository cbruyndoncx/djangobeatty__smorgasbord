'use client';

import { useState, useCallback } from 'react';
import { usePolecats, useRigs } from '@/lib/use-beads';
import { useCrewStatus } from '@/lib/use-crew';
import { NavBar } from '@/components/layout';
import { ConfirmModal } from '@/components/settings';
import type { Polecat } from '@/types/beads';
import type { CrewMember } from '@/types/crew';

export default function WorkersPage() {
  const { polecats, isLoading: polecatsLoading, refresh: refreshPolecats } = usePolecats();
  const { crewState, isLoading: crewLoading, refresh: refreshCrew } = useCrewStatus();
  const { rigs } = useRigs();

  const crew = crewState?.members ?? [];

  const [selectedWorker, setSelectedWorker] = useState<{ type: 'crew' | 'polecat'; id: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [sessionView, setSessionView] = useState<{ name: string; output: string } | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    variant?: 'danger' | 'warning' | 'default';
    onConfirm: () => void;
  } | null>(null);

  const isLoading = polecatsLoading || crewLoading;

  // Combined stats
  const totalWorkers = polecats.length + crew.length;
  const activePolecats = polecats.filter(p => p.status === 'active').length;
  const activeCrew = crew.filter(c => c.status === 'running').length;
  const totalActive = activePolecats + activeCrew;
  const totalWithMail = polecats.filter(p => p.unread_mail > 0).length + crew.filter(c => c.mailCount > 0).length;

  const handleNudge = useCallback(async (name: string, rig: string, type: 'crew' | 'polecat') => {
    if (!messageText.trim()) {
      setStatusMessage({ type: 'error', text: 'Message cannot be empty' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/${type === 'crew' ? 'crew' : 'polecats'}/${encodeURIComponent(name)}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to send message to ${name}`);
      }

      setStatusMessage({ type: 'success', text: `Message sent to ${name}` });
      setMessageText('');
      setSelectedWorker(null);

      // Refresh data
      if (type === 'crew') {
        refreshCrew();
      } else {
        refreshPolecats();
      }
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send message',
      });
    } finally {
      setIsSending(false);
    }
  }, [messageText, refreshCrew, refreshPolecats]);

  const handleViewSession = useCallback(async (polecatName: string) => {
    setIsLoadingSession(true);
    setSessionView(null);

    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/session`);

      if (!response.ok) {
        throw new Error('Failed to fetch session');
      }

      const data = await response.json();
      setSessionView({ name: data.name, output: data.output });
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to load session',
      });
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  const handleNuke = useCallback((polecatName: string, rig: string) => {
    setConfirmModal({
      title: 'Nuke Polecat',
      message: `Are you sure you want to nuke ${polecatName}? This will terminate the polecat and delete its worktree.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/nuke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rig }),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check if it's a safety check failure that can be forced
            if (errorData.canForce) {
              setConfirmModal({
                title: 'Force Nuke',
                message: `${errorData.error}\n\nDo you want to force nuke? This will LOSE ANY UNCOMMITTED WORK.`,
                variant: 'danger',
                onConfirm: async () => {
                  setConfirmModal(null);
                  try {
                    const forceResponse = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/nuke`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ rig, force: true }),
                    });

                    if (!forceResponse.ok) {
                      const forceErrorData = await forceResponse.json();
                      throw new Error(forceErrorData.error || `Failed to force nuke ${polecatName}`);
                    }

                    setStatusMessage({ type: 'success', text: `${polecatName} force nuked successfully` });
                    refreshPolecats();
                  } catch (err) {
                    setStatusMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Failed to force nuke polecat',
                    });
                  }
                },
              });
              return;
            }

            throw new Error(errorData.error || `Failed to nuke ${polecatName}`);
          }

          setStatusMessage({ type: 'success', text: `${polecatName} nuked successfully` });
          refreshPolecats();
        } catch (error) {
          setStatusMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to nuke polecat',
          });
        }
      },
    });
  }, [refreshPolecats]);

  const handlePolecatStart = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} started successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start polecat',
      });
    }
  }, [refreshPolecats]);

  const handlePolecatStop = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} stopped successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to stop polecat',
      });
    }
  }, [refreshPolecats]);

  const handlePolecatRestart = useCallback(async (polecatName: string, rig: string) => {
    try {
      const response = await fetch(`/api/polecats/${encodeURIComponent(polecatName)}/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rig }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to restart ${polecatName}`);
      }

      setStatusMessage({ type: 'success', text: `${polecatName} restarted successfully` });
      refreshPolecats();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restart polecat',
      });
    }
  }, [refreshPolecats]);

  const handleCrewStart = useCallback(async (crewName: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/start`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to start ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} started successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewStop = useCallback(async (crewName: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/stop`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to stop ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} stopped successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to stop crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRestart = useCallback(async (crewName: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/restart`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to restart ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} restarted successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to restart crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRefresh = useCallback(async (crewName: string) => {
    try {
      const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to refresh ${crewName}`);
      }

      setStatusMessage({ type: 'success', text: `${crewName} refreshed successfully` });
      refreshCrew();
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to refresh crew member',
      });
    }
  }, [refreshCrew]);

  const handleCrewRemove = useCallback((crewName: string) => {
    setConfirmModal({
      title: 'Remove Crew Member',
      message: `Are you sure you want to remove ${crewName}? This will permanently delete the workspace.`,
      variant: 'danger',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const response = await fetch(`/api/crew/${encodeURIComponent(crewName)}/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          });

          if (!response.ok) {
            const errorData = await response.json();

            // Check if it's a safety check failure that can be forced
            if (errorData.canForce) {
              setConfirmModal({
                title: 'Force Remove',
                message: `${errorData.error}\n\nDo you want to force remove? This will LOSE ANY UNCOMMITTED WORK.`,
                variant: 'danger',
                onConfirm: async () => {
                  setConfirmModal(null);
                  try {
                    const forceResponse = await fetch(`/api/crew/${encodeURIComponent(crewName)}/remove`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ force: true }),
                    });

                    if (!forceResponse.ok) {
                      const forceErrorData = await forceResponse.json();
                      throw new Error(forceErrorData.error || `Failed to force remove ${crewName}`);
                    }

                    setStatusMessage({ type: 'success', text: `${crewName} force removed successfully` });
                    refreshCrew();
                  } catch (err) {
                    setStatusMessage({
                      type: 'error',
                      text: err instanceof Error ? err.message : 'Failed to force remove crew member',
                    });
                  }
                },
              });
              return;
            }

            throw new Error(errorData.error || `Failed to remove ${crewName}`);
          }

          setStatusMessage({ type: 'success', text: `${crewName} removed successfully` });
          refreshCrew();
        } catch (error) {
          setStatusMessage({
            type: 'error',
            text: error instanceof Error ? error.message : 'Failed to remove crew member',
          });
        }
      },
    });
  }, [refreshCrew]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Workers
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              All crew members and polecats in your Gas Town system
            </p>
          </div>
          <button
            onClick={() => {
              refreshCrew();
              refreshPolecats();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {totalWorkers}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Total Workers</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {totalActive}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Active</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalWithMail}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">With Mail</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-2xl font-bold text-zinc-600 dark:text-zinc-400">
              {crew.length} / {polecats.length}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Crew / Polecats</div>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mb-4 rounded-md border p-3 ${
              statusMessage.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        {isLoading && totalWorkers === 0 ? (
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 animate-spin text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Loading workers...
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Crew Section */}
            {crew.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Crew Members ({crew.length})
                </h2>
                <div className="space-y-3">
                  {crew.map((member) => (
                    <div
                      key={member.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Status Dot */}
                          <div className="mt-1">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                member.status === 'running'
                                  ? 'bg-emerald-500'
                                  : member.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-zinc-400'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                {member.name}
                              </span>
                              {member.mailCount > 0 && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {member.mailCount} mail
                                </span>
                              )}
                              {member.gitStatus === 'dirty' && (
                                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                  uncommitted
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              Rig: {member.rig} • Branch: {member.branch} • Status: {member.status}
                            </div>
                            {member.lastActivity && (
                              <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                                Last activity: {member.lastActivity}
                              </div>
                            )}

                            {/* Message Box */}
                            {selectedWorker?.type === 'crew' && selectedWorker.id === member.id && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder="Type your message..."
                                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleNudge(member.name, member.rig, 'crew')}
                                    disabled={isSending || !messageText.trim()}
                                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                                  >
                                    {isSending ? 'Sending...' : 'Send'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWorker(null);
                                      setMessageText('');
                                    }}
                                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {(!selectedWorker || selectedWorker.type !== 'crew' || selectedWorker.id !== member.id) && (
                          <div className="flex gap-2">
                            {member.status === 'stopped' ? (
                              <button
                                onClick={() => handleCrewStart(member.name)}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                              >
                                Start
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => setSelectedWorker({ type: 'crew', id: member.id })}
                                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Message
                                </button>
                                <button
                                  onClick={() => handleCrewRefresh(member.name)}
                                  className="rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900"
                                >
                                  Refresh
                                </button>
                                <button
                                  onClick={() => handleCrewRestart(member.name)}
                                  className="rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
                                >
                                  Restart
                                </button>
                                <button
                                  onClick={() => handleCrewStop(member.name)}
                                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Stop
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleCrewRemove(member.name)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Polecats Section */}
            {polecats.length > 0 && (
              <div>
                <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  Polecats ({polecats.length})
                </h2>
                <div className="space-y-3">
                  {polecats.map((polecat) => (
                    <div
                      key={polecat.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {/* Status Dot */}
                          <div className="mt-1">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                polecat.status === 'active'
                                  ? 'bg-emerald-500'
                                  : polecat.status === 'idle'
                                  ? 'bg-blue-500'
                                  : polecat.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-zinc-400'
                              }`}
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                {polecat.name}
                              </span>
                              {polecat.unread_mail > 0 && (
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  {polecat.unread_mail} mail
                                </span>
                              )}
                              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {polecat.status}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                              Rig: {polecat.rig}
                              {polecat.hooked_work && ` • Hooked: ${polecat.hooked_work}`}
                            </div>

                            {/* Message Box */}
                            {selectedWorker?.type === 'polecat' && selectedWorker.id === polecat.id && (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={messageText}
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder="Type your message..."
                                  className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
                                  rows={3}
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleNudge(polecat.name, polecat.rig, 'polecat')}
                                    disabled={isSending || !messageText.trim()}
                                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                                  >
                                    {isSending ? 'Sending...' : 'Send'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedWorker(null);
                                      setMessageText('');
                                    }}
                                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        {(!selectedWorker || selectedWorker.type !== 'polecat' || selectedWorker.id !== polecat.id) && (
                          <div className="flex gap-2">
                            {(polecat.status === 'active' || polecat.status === 'idle') ? (
                              <>
                                <button
                                  onClick={() => handleViewSession(polecat.name)}
                                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Session
                                </button>
                                <button
                                  onClick={() => setSelectedWorker({ type: 'polecat', id: polecat.id })}
                                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Nudge
                                </button>
                                <button
                                  onClick={() => handlePolecatRestart(polecat.name, polecat.rig)}
                                  className="rounded-md border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900"
                                >
                                  Restart
                                </button>
                                <button
                                  onClick={() => handlePolecatStop(polecat.name, polecat.rig)}
                                  className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                                >
                                  Stop
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handlePolecatStart(polecat.name, polecat.rig)}
                                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900"
                              >
                                Start
                              </button>
                            )}
                            <button
                              onClick={() => handleNuke(polecat.name, polecat.rig)}
                              className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
                            >
                              Nuke
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalWorkers === 0 && !isLoading && (
              <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-zinc-600 dark:text-zinc-400">No workers found</p>
              </div>
            )}
          </div>
        )}

        {/* Session Viewer Modal */}
        {sessionView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  Session: {sessionView.name}
                </h3>
                <button
                  onClick={() => setSessionView(null)}
                  className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Session Output */}
              <div className="max-h-[70vh] overflow-auto bg-zinc-950 p-4">
                <pre className="font-mono text-xs text-zinc-100 whitespace-pre-wrap">
                  {sessionView.output}
                </pre>
              </div>

              {/* Footer */}
              <div className="flex justify-between border-t border-zinc-200 p-4 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Tip: Use 'gt attach {sessionView.name}' for interactive terminal access
                </p>
                <button
                  onClick={() => handleViewSession(sessionView.name)}
                  disabled={isLoadingSession}
                  className="rounded-md bg-zinc-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-500 disabled:opacity-50"
                >
                  {isLoadingSession ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          variant={confirmModal.variant}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
