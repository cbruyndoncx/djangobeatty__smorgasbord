/**
 * Types for Gas Town mail system
 */

export interface MailMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
  read: boolean;
}

export interface MailboxState {
  messages: MailMessage[];
  unreadCount: number;
}
