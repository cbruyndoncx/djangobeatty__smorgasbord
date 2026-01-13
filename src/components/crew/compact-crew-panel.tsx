'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface CrewMember {
  name: string;
  address: string;
  rig: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
}

export function CompactCrewPanel() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCrew, setSelectedCrew] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchCrew = async () => {
      try {
        const response = await fetch('/api/status');
        if (!response.ok) return;
        const data = await response.json();

        const allCrew: CrewMember[] = [];
        if (data.rigs) {
          for (const rig of data.rigs) {
            if (rig.agents) {
              for (const agent of rig.agents) {
                if (agent.role === 'crew') {
                  allCrew.push({
                    name: agent.name,
                    address: agent.address,
                    rig: rig.name,
                    running: agent.running,
                    has_work: agent.has_work,
                    unread_mail: agent.unread_mail || 0,
                    first_subject: agent.first_subject,
                  });
                }
              }
            }
          }
        }
        setCrew(allCrew);
      } catch (err) {
        console.error('Failed to fetch crew:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCrew();
    const interval = setInterval(fetchCrew, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async () => {
    if (!selectedCrew || !message.trim()) return;

    const member = crew.find((c) => c.address === selectedCrew);
    if (!member) return;

    setSending(true);
    try {
      const response = await fetch('/api/crew/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: `${member.rig}/crew/${member.name}`,
          subject: 'Dashboard Message',
          message: message.trim(),
        }),
      });

      if (response.ok) {
        setMessage('');
        setSelectedCrew(null);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const crewWithMail = crew.filter(c => c.unread_mail > 0).length;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Crew
        </h3>
        {crewWithMail > 0 && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            {crewWithMail} with mail
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-zinc-500">Loading...</div>
      ) : crew.length === 0 ? (
        <div className="text-xs text-zinc-500">No crew members</div>
      ) : (
        <div className="space-y-2">
          {crew.map((member) => (
            <div
              key={member.address}
              className="rounded bg-zinc-50 dark:bg-zinc-800/50 overflow-hidden"
            >
              {/* Crew member row */}
              <button
                onClick={() => setSelectedCrew(selectedCrew === member.address ? null : member.address)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left"
              >
                {/* Status dot */}
                <span
                  className={cn(
                    'w-2 h-2 rounded-full flex-shrink-0',
                    member.running && member.has_work
                      ? 'bg-green-500'
                      : member.running
                      ? 'bg-blue-500'
                      : 'bg-zinc-500'
                  )}
                />

                {/* Name and rig */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      {member.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {member.rig}
                    </span>
                  </div>

                  {/* First subject if has unread mail */}
                  {member.first_subject && member.unread_mail > 0 && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                      {member.first_subject}
                    </div>
                  )}
                </div>

                {/* Mail badge */}
                {member.unread_mail > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 flex-shrink-0">
                    {member.unread_mail}
                  </span>
                )}
              </button>

              {/* Inline message box when selected */}
              {selectedCrew === member.address && (
                <div className="px-3 pb-3 flex gap-2 border-t border-zinc-200 dark:border-zinc-700 pt-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                      if (e.key === 'Escape') {
                        setSelectedCrew(null);
                        setMessage('');
                      }
                    }}
                    placeholder={`Message ${member.name}...`}
                    className="flex-1 px-3 py-2 text-sm rounded bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
                  >
                    {sending ? '...' : 'Send'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
