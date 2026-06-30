import { ActiveLoanSummaryResponse } from '../models/loans/loans.model';
import { normalizeStatusType, StatusType } from '../models/status/status-type';

export const ACTIVE_LOAN_STATUSES = new Set<StatusType>([
  StatusType.EM_PREPARACAO,
  StatusType.EM_USO,
  StatusType.EM_DEVOLUCAO
]);

export interface LoanFormDefaults {
  responsavel: string;
  projeto: string;
  colaboradorId: string;
}

export function extractLoanFormDefaults(activeLoan: ActiveLoanSummaryResponse | null | undefined): LoanFormDefaults {
  if (!activeLoan || typeof activeLoan !== 'object') {
    return { responsavel: '', projeto: '', colaboradorId: '' };
  }

  const record = activeLoan as Record<string, unknown>;
  const responsavelRaw = record['responsavel'];

  let responsavel = '';
  if (typeof responsavelRaw === 'string') {
    responsavel = responsavelRaw.trim();
  } else if (responsavelRaw && typeof responsavelRaw === 'object') {
    responsavel = String((responsavelRaw as { fullName?: string }).fullName ?? '').trim();
  }
  if (!responsavel) {
    responsavel = String(record['fullName'] ?? '').trim();
  }

  const colaboradorId = String(
    record['colaboradorId'] ??
      (typeof responsavelRaw === 'object' ? (responsavelRaw as { id?: string }).id : '') ??
      ''
  ).trim();

  const projeto = String(
    record['projectName'] ??
      record['helpdeskTicket'] ??
      record['helpdesk_ticket'] ??
      record['helpDeskTicket'] ??
      record['projeto'] ??
      record['project'] ??
      ''
  ).trim();

  return { responsavel, projeto, colaboradorId };
}

export function hasLoanFormDefaults(defaults: LoanFormDefaults): boolean {
  return !!(defaults.projeto || defaults.responsavel || defaults.colaboradorId);
}

export function isMovementLoanPrefillStatus(status: unknown): boolean {
  const normalized = normalizeStatusType(status);
  return normalized != null && ACTIVE_LOAN_STATUSES.has(normalized);
}
