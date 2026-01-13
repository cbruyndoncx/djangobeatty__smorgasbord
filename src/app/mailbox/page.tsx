'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useMailbox } from '@/lib/use-mail';
import { useCrewStatus } from '@/lib/use-crew';
import { usePolecats, useRefineries, useWitnesses } from '@/lib/use-beads';
import { useGtStatus } from '@/lib/use-gt-status';
import { useFeature } from '@/lib/project-mode';
import { NavBar } from '@/components/layout';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { MailMessage } from '@/types/mail';

interface Recipient {
  address: string;
  label: string;
  type: 'town' | 'crew' | 'refinery' | 'polecat' | 'witness';
  status: 'active' | 'idle' | 'stopped' | 'running' | 'error' | 'processing';
}

// Status dot colors
const statusColors: Record<Recipient['status'], string> = {
  active: 'bg-green-500',
  running: 'bg-green-500',
  processing: 'bg-blue-500 animate-pulse',
  idle: 'bg-yellow-500',
  stopped: 'bg-zinc-400',
  error: 'bg-red-500',
};

interface MessageCardProps {
  message: MailMessage;
  isSelected: boolean;
  onSelect: () => void;
}

function MessageCard({ message, isSelected, onSelect }: MessageCardProps) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-4 cursor-pointer transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
          : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-gray-900/50 hover:border-zinc-300 dark:hover:border-zinc-600',
        !message.read && 'border-l-4 border-l-blue-500'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {!message.read && (
            <span className="w-2 h-2 rounded-full bg-blue-500" />
          )}
          <span className="font-medium text-zinc-900 dark:text-white">
            {message.from}
          </span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-gray-500">
          {formatRelativeTime(message.timestamp)}
        </span>
      </div>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
        {message.subject}
      </p>
      {message.body && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-gray-500 truncate">
          {message.body.slice(0, 100)}
        </p>
      )}
    </div>
  );
}

interface MessageDetailProps {
  message: MailMessage | null;
  onClose: () => void;
  onReply: (message: MailMessage) => void;
}

function MessageDetail({ message, onClose, onReply }: MessageDetailProps) {
  if (!message) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-8 text-center shadow-sm dark:shadow-none h-full flex items-center justify-center">
        <p className="text-zinc-500">Select a message to view details</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm dark:shadow-none h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              {message.subject}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-gray-500">
              From: <span className="text-zinc-700 dark:text-zinc-300">{message.from}</span>
            </p>
            <p className="text-xs text-zinc-400 dark:text-gray-600">
              {new Date(message.timestamp).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onReply(message)}
              className="px-3 py-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-gray-800 hover:bg-zinc-200 dark:hover:bg-gray-700 rounded transition-colors"
            >
              Reply
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-gray-800 rounded transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-4 overflow-auto">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
          {message.body || '(No content)'}
        </p>
      </div>
    </div>
  );
}

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  replyTo?: MailMessage;
  recipients: Recipient[];
  onSend: (to: string, subject: string, body: string) => Promise<void>;
}

function ComposeModal({ isOpen, onClose, replyTo, recipients, onSend }: ComposeModalProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedRecipient = recipients.find((r) => r.address === to);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Update form fields when replyTo changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDropdownOpen(false);
      setTo(replyTo?.from || '');
      setSubject(replyTo ? `Re: ${replyTo.subject}` : '');
      setBody('');
    }
  }, [isOpen, replyTo]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      return;
    }

    setIsSending(true);
    try {
      await onSend(to, subject, body);
      setTo('');
      setSubject('');
      setBody('');
      onClose();
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {replyTo ? 'Reply to Message' : 'Compose Message'}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-4">
          <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              To
            </label>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={cn(
                'mt-1 w-full rounded-md border px-3 py-2 text-sm text-left flex items-center justify-between',
                'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700',
                'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
                !selectedRecipient && 'text-zinc-400 dark:text-zinc-500'
              )}
            >
              {selectedRecipient ? (
                <span className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', statusColors[selectedRecipient.status])} />
                  <span className="text-zinc-900 dark:text-zinc-100">{selectedRecipient.address}</span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                    ({selectedRecipient.type})
                  </span>
                </span>
              ) : (
                'Select recipient...'
              )}
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isDropdownOpen && (() => {
              // Show all recipients except those in error state
              // Stopped agents CAN receive mail - it goes to their persistent inbox in Beads (Git-backed)
              // and they'll see it when they restart or during seance
              const availableRecipients = recipients.filter((r) => r.status !== 'error');
              const activeRecipients = availableRecipients.filter(
                (r) => r.status === 'active' || r.status === 'running' || r.status === 'processing'
              );
              const idleRecipients = availableRecipients.filter((r) => r.status === 'idle');
              const stoppedRecipients = availableRecipients.filter((r) => r.status === 'stopped');

              return (
                <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg">
                  {availableRecipients.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-500">No recipients available</div>
                  ) : (
                    <>
                      {/* Active/Running */}
                      {activeRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-b border-zinc-200 dark:border-zinc-700">
                            Active
                          </div>
                          {activeRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => {
                                setTo(r.address);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700',
                                to === r.address && 'bg-blue-50 dark:bg-blue-500/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-zinc-900 dark:text-zinc-100 truncate">{r.address}</span>
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Idle */}
                      {idleRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10 border-b border-zinc-200 dark:border-zinc-700">
                            Idle
                          </div>
                          {idleRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => {
                                setTo(r.address);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700',
                                to === r.address && 'bg-blue-50 dark:bg-blue-500/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-zinc-900 dark:text-zinc-100 truncate">{r.address}</span>
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Stopped */}
                      {stoppedRecipients.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-700/50 border-b border-zinc-200 dark:border-zinc-700">
                            Stopped (mail delivered on restart)
                          </div>
                          {stoppedRecipients.map((r) => (
                            <button
                              key={r.address}
                              type="button"
                              onClick={() => {
                                setTo(r.address);
                                setIsDropdownOpen(false);
                              }}
                              className={cn(
                                'w-full px-3 py-2 text-sm text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-700',
                                to === r.address && 'bg-blue-50 dark:bg-blue-500/10'
                              )}
                            >
                              <span className={cn('w-2 h-2 rounded-full flex-shrink-0', statusColors[r.status])} />
                              <span className="flex-1 text-zinc-900 dark:text-zinc-100 truncate">{r.address}</span>
                              <span className="text-zinc-500 dark:text-zinc-400 text-xs flex-shrink-0">{r.type}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Message subject"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message..."
              rows={8}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500"
            />
          </div>

          {replyTo && (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Replying to:</p>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-medium">{replyTo.from}:</span> {replyTo.subject}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
          <button
            onClick={onClose}
            disabled={isSending}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !body.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MailboxPage() {
  const hasMailbox = useFeature('controlPlane');
  const { mailbox, isLoading, error, refresh } = useMailbox();
  const { crewState } = useCrewStatus({ pollInterval: 30000 }); // Less frequent polling for recipients
  const { status: gtStatus } = useGtStatus({ pollingInterval: 30000 });
  const { polecats } = usePolecats();
  const { refineries } = useRefineries();
  const { witnesses } = useWitnesses();
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<MailMessage | undefined>(undefined);
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Get mayor and deacon status from gt status OUTSIDE useMemo to ensure fresh values
  const mayorAgent = gtStatus?.agents?.find(
    (a) => a.name.toLowerCase() === 'mayor' || a.role === 'coordinator' || a.role === 'mayor'
  );
  const deaconAgent = gtStatus?.agents?.find(
    (a) => a.name.toLowerCase() === 'deacon' || a.role === 'health-check' || a.role === 'deacon'
  );
  const mayorRunning = mayorAgent?.running ?? false;
  const deaconRunning = deaconAgent?.running ?? false;

  // Build recipients list from all mailable entities
  const recipients = useMemo<Recipient[]>(() => {
    const list: Recipient[] = [
      // Town-level agents - use actual status from gt status
      {
        address: 'mayor/',
        label: 'Mayor',
        type: 'town',
        status: mayorRunning ? 'running' : 'stopped',
      },
      {
        address: 'deacon/',
        label: 'Deacon',
        type: 'town',
        status: deaconRunning ? 'running' : 'stopped',
      },
    ];

    // Add crew members
    if (crewState?.members) {
      for (const member of crewState.members) {
        list.push({
          address: `${member.rig}/${member.name}`,
          label: member.name,
          type: 'crew',
          status: member.status === 'running' ? 'running' : member.status === 'error' ? 'error' : 'stopped',
        });
      }
    }

    // Add polecats
    for (const polecat of polecats) {
      list.push({
        address: `${polecat.rig}/${polecat.name}`,
        label: polecat.name,
        type: 'polecat',
        status: polecat.status === 'active' ? 'active' : polecat.status === 'idle' ? 'idle' : 'stopped',
      });
    }

    // Add refineries
    for (const refinery of refineries) {
      list.push({
        address: `${refinery.rig}/${refinery.name}`,
        label: refinery.name,
        type: 'refinery',
        status: refinery.status === 'processing' ? 'processing' : refinery.status === 'active' ? 'active' : refinery.status === 'error' ? 'error' : 'idle',
      });
    }

    // Add witnesses
    for (const witness of witnesses) {
      list.push({
        address: `${witness.rig}/witness`,
        label: `${witness.rig} witness`,
        type: 'witness',
        status: witness.status === 'active' ? 'active' : witness.status === 'idle' ? 'idle' : 'stopped',
      });
    }

    // Sort: active first, then idle, then stopped/error
    const statusOrder = { active: 0, running: 0, processing: 1, idle: 2, stopped: 3, error: 4 };
    list.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return list;
  }, [mayorRunning, deaconRunning, crewState, polecats, refineries, witnesses]);

  const handleReply = useCallback((message: MailMessage) => {
    setReplyToMessage(message);
    setIsComposeOpen(true);
  }, []);

  const handleCompose = useCallback(() => {
    setReplyToMessage(undefined);
    setIsComposeOpen(true);
  }, []);

  const handleCloseCompose = useCallback(() => {
    setIsComposeOpen(false);
    setReplyToMessage(undefined);
  }, []);

  const handleSendMessage = useCallback(async (to: string, subject: string, body: string) => {
    setSendStatus(null);

    try {
      const response = await fetch('/api/mail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      setSendStatus({ type: 'success', text: `Message sent to ${to}` });

      // Refresh mailbox after sending
      setTimeout(() => {
        refresh();
        setSendStatus(null);
      }, 2000);
    } catch (error) {
      setSendStatus({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to send message',
      });
      throw error;
    }
  }, [refresh]);

  // Feature not available in current mode
  if (!hasMailbox) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <NavBar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Mailbox Not Available
            </h2>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">
              The mailbox is only available in Gas Town mode.
              This project is running in beads-only mode.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <NavBar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Overseer Mailbox
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Messages from Gas Town agents
            </p>
          </div>

          <div className="flex items-center gap-3">
            {mailbox.unreadCount > 0 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/30">
                {mailbox.unreadCount} unread
              </span>
            )}
            <button
              onClick={handleCompose}
              className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <svg className="inline-block w-4 h-4 mr-2 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Compose
            </button>
            <button
              onClick={refresh}
              disabled={isLoading}
              className="px-4 py-2 text-sm rounded-md bg-zinc-100 dark:bg-gray-800 hover:bg-zinc-200 dark:hover:bg-gray-700 text-zinc-700 dark:text-gray-300 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Send Status Message */}
        {sendStatus && (
          <div
            className={`mb-4 rounded-md border p-3 ${
              sendStatus.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
            }`}
          >
            {sendStatus.text}
          </div>
        )}

        {/* Content */}
        {isLoading && mailbox.messages.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-500">Loading mailbox...</div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
            <p className="text-red-600 dark:text-red-400">Error loading mailbox: {error.message}</p>
          </div>
        )}

        {!isLoading && !error && mailbox.messages.length === 0 && (
          <div className="rounded-lg border border-zinc-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 p-8 text-center shadow-sm dark:shadow-none">
            <p className="text-zinc-500">No messages in your mailbox</p>
          </div>
        )}

        {!error && mailbox.messages.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message List */}
            <div className="space-y-3">
              {mailbox.messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  isSelected={selectedMessage?.id === message.id}
                  onSelect={() => setSelectedMessage(message)}
                />
              ))}
            </div>

            {/* Message Detail */}
            <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-12rem)]">
              <MessageDetail
                message={selectedMessage}
                onClose={() => setSelectedMessage(null)}
                onReply={handleReply}
              />
            </div>
          </div>
        )}

        {/* Compose Modal */}
        <ComposeModal
          isOpen={isComposeOpen}
          onClose={handleCloseCompose}
          replyTo={replyToMessage}
          recipients={recipients}
          onSend={handleSendMessage}
        />
      </main>
    </div>
  );
}
