/**
 * Types for gt status command output
 */

export interface GtAgent {
  name: string;
  address: string;
  session?: string;
  role: string;
  running: boolean;
  has_work: boolean;
  unread_mail: number;
  first_subject?: string;
}

export interface GtStatusOutput {
  name: string;
  agents: GtAgent[];
}

export type AgentRole = 'mayor' | 'deacon' | 'witness' | 'polecat' | 'crew' | 'unknown';

export interface GtStatusSummary {
  totalAgents: number;
  runningAgents: number;
  agentsWithWork: number;
  totalUnreadMail: number;
  byRole: {
    [key in AgentRole]?: {
      total: number;
      running: number;
      withWork: number;
      unreadMail: number;
    };
  };
}
