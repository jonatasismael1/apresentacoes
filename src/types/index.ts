export interface Presentation {
  id: string;
  clientName: string;
  clientSegment: string;
  title: string;
  objective: string;
  format: string;
  responsible: string;
  date: string;
  clientLogo?: string; // Base64
  primaryColor?: string;
  secondaryColor?: string;
  scripts: Script[];
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
  clientProfileId?: string;
  approvalStatus?: ApprovalStatus;
  comments?: ApprovalComment[];
  history?: PresentationVersion[];
}

export type ApprovalStatus = 'draft' | 'sent' | 'approved' | 'changes_requested';

export interface ApprovalComment {
  id: string;
  author: string;
  message: string;
  createdAt: string;
  resolved?: boolean;
}

export interface PresentationVersion {
  id: string;
  createdAt: string;
  label: string;
  snapshot: Omit<Presentation, 'history'>;
}

export interface ClientProfile {
  id: string;
  name: string;
  segment: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  tone?: string;
  createdAt: string;
  updatedAt: string;
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'pending' | 'error';

export interface TeleprompterSettings {
  speed: number;
  fontSize: number;
  lineHeight: number;
  width: number; // percentage
  isMirrored: boolean;
  theme: 'dark' | 'light' | 'custom';
  bgColor: string;
  textColor: string;
}

export interface Script {
  id: string;
  title: string;
  theme: string;
  audience: string;
  tone: string;
  hook: string;
  development: string;
  cta: string;
  notes: string;
  referenceLink?: string;
}

export interface ScriptTemplate {
  id: string;
  name: string;
  category: 'venda' | 'institucional' | 'reels' | 'aula' | 'podcast' | 'anuncio';
  description: string;
  script: Omit<Script, 'id'>;
}

export interface ExportOptions {
  includeCover: boolean;
  includeObjective: boolean;
  includeScripts: boolean;
  scriptIds: string[];
  includeComments: boolean;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
