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
}

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

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
