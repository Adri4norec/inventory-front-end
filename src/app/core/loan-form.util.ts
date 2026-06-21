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
  if (!activeLoan) {
    return { responsavel: '', projeto: '', colaboradorId: '' };
  }
  return {
    responsavel: activeLoan.responsavel || '',
    projeto: activeLoan.helpdeskTicket || '',
    colaboradorId: activeLoan.colaboradorId ? String(activeLoan.colaboradorId) : ''
  };
}

export function hasLoanFormDefaults(defaults: LoanFormDefaults): boolean {
  return !!(defaults.projeto || defaults.responsavel || defaults.colaboradorId);
}

export function isMovementLoanPrefillStatus(status: unknown): boolean {
  return normalizeStatusType(status) === StatusType.EM_USO;
}
