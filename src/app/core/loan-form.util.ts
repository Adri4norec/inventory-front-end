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
  projectId: string;
  colaboradorId: string;
}

export function extractLoanFormDefaults(activeLoan: ActiveLoanSummaryResponse | null | undefined): LoanFormDefaults {
  if (!activeLoan || typeof activeLoan !== 'object') {
    return { responsavel: '', projeto: '', projectId: '', colaboradorId: '' };
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

  const projectRaw = record['project'];
  let projectId = String(record['projectId'] ?? '').trim();
  let projeto = '';

  if (projectRaw && typeof projectRaw === 'object') {
    const project = projectRaw as Record<string, unknown>;
    if (!projectId) {
      projectId = String(project['id'] ?? '').trim();
    }
    projeto = String(project['name'] ?? project['nome'] ?? '').trim();
  } else if (typeof projectRaw === 'string') {
    projeto = projectRaw.trim();
  }

  if (!projeto) {
    projeto = String(
      record['projectName'] ??
        record['helpdeskTicket'] ??
        record['helpdesk_ticket'] ??
        record['helpDeskTicket'] ??
        record['projeto'] ??
        ''
    ).trim();
  }

  return { responsavel, projeto, projectId, colaboradorId };
}

export function hasLoanFormDefaults(defaults: LoanFormDefaults): boolean {
  return !!(defaults.projeto || defaults.responsavel || defaults.colaboradorId || defaults.projectId);
}

export function isMovementLoanPrefillStatus(status: unknown): boolean {
  const normalized = normalizeStatusType(status);
  return normalized != null && ACTIVE_LOAN_STATUSES.has(normalized);
}
