import type { ApprovalStatus } from '../types';

export const PRESENTATION_STATUSES: Array<{ value: ApprovalStatus; label: string }> = [
  { value: 'sent', label: 'Enviado' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'revision', label: 'Revisão' },
  { value: 'recorded', label: 'Gravado' },
  { value: 'finalized', label: 'Finalizado' },
];

export const PRESENTATION_STATUS_LABELS: Record<ApprovalStatus, string> = {
  sent: 'Enviado',
  approved: 'Aprovado',
  revision: 'Revisão',
  recorded: 'Gravado',
  finalized: 'Finalizado',
};

export type LegacyApprovalStatus = ApprovalStatus | 'draft' | 'changes_requested' | undefined;

export function normalizeApprovalStatus(status: LegacyApprovalStatus): ApprovalStatus {
  if (status === 'changes_requested') return 'revision';
  if (status === 'approved' || status === 'revision' || status === 'recorded' || status === 'finalized') {
    return status;
  }
  return 'sent';
}
