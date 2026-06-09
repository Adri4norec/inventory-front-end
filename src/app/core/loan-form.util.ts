import { LoanDetailResponse, LoanListResponse } from '../models/loans/loans.model';
import { normalizeStatusType, StatusType } from '../models/status/status-type';

/** Status de empréstimo ainda em andamento (não devolvido/cancelado). */
export const ACTIVE_LOAN_STATUSES = new Set<StatusType>([
  StatusType.EM_PREPARACAO,
  StatusType.EM_USO,
  StatusType.EM_DEVOLUCAO
]);

/** Status do equipamento em que a movimentação está habilitada e há empréstimo vigente. */
export function isMovementLoanPrefillStatus(status: unknown): boolean {
  return normalizeStatusType(status) === StatusType.EM_USO;
}

function codesMatch(a: string, b: string): boolean {
  const sa = a.trim();
  const sb = b.trim();
  if (!sa || !sb) return false;
  if (sa === sb) return true;
  const na = Number(sa);
  const nb = Number(sb);
  return !Number.isNaN(na) && !Number.isNaN(nb) && na === nb;
}

function isTerminalLoanStatus(status: unknown): boolean {
  const raw = String(status ?? '').trim().toUpperCase();
  return ['DEVOLVIDO', 'CANCELADO', 'DISPONIVEL', 'EMPRESTIMO_FINALIZADO'].includes(raw);
}

export function readActiveLoanId(source: unknown): string {
  if (!source || typeof source !== 'object') return '';
  const record = source as Record<string, unknown>;

  const nested = record['activeLoan'] ?? record['currentLoan'] ?? record['loan'];
  if (nested && typeof nested === 'object') {
    const nestedId = String((nested as Record<string, unknown>)['id'] ?? '').trim();
    if (nestedId) return nestedId;
  }

  return String(
    record['loanId'] ?? record['activeLoanId'] ?? record['currentLoanId'] ?? ''
  ).trim();
}

/** Prefer activeLoan embutido no equipamento; fallback nos campos raiz. */
export function extractLoanDefaultsFromEquipment(equipment: unknown): LoanFormDefaults {
  if (!equipment || typeof equipment !== 'object') {
    return { responsavel: '', projeto: '', colaboradorId: '' };
  }
  const record = equipment as Record<string, unknown>;
  const nested = record['activeLoan'];
  const fromNested = nested ? extractLoanFormDefaults(nested as LoanDetailResponse) : null;
  const fromRoot = extractLoanFormDefaults(equipment as LoanDetailResponse);

  return {
    responsavel: fromNested?.responsavel || fromRoot.responsavel,
    projeto: fromNested?.projeto || fromRoot.projeto,
    colaboradorId: fromNested?.colaboradorId || fromRoot.colaboradorId
  };
}

export function hasLoanFormDefaults(defaults: LoanFormDefaults): boolean {
  return !!(defaults.projeto || defaults.responsavel || defaults.colaboradorId);
}

export function extractColaboradorId(loan: unknown): string {
  if (!loan || typeof loan !== 'object') return '';
  const record = loan as Record<string, unknown>;

  const direct = String(
    record['colaboradorId'] ??
    record['colaboradorID'] ??
    record['responsavelId'] ??
    record['responsibleId'] ??
    record['userId'] ??
    record['usuarioId'] ??
    record['collaboratorId'] ??
    record['employeeId'] ??
    ''
  ).trim();
  if (direct) return direct;

  const nested =
    record['colaborador'] ??
    record['responsavel'] ??
    record['responsible'] ??
    record['usuario'] ??
    record['user'] ??
    record['collaborator'] ??
    record['employee'];

  if (nested && typeof nested === 'object') {
    const obj = nested as Record<string, unknown>;
    return String(
      obj['id'] ??
      obj['colaboradorId'] ??
      obj['userId'] ??
      obj['usuarioId'] ??
      obj['employeeId'] ??
      ''
    ).trim();
  }

  return '';
}

export function extractColaboradorDisplayName(loan: unknown): string {
  if (!loan || typeof loan !== 'object') return '';
  const record = loan as Record<string, unknown>;

  const direct = String(
    record['fullName'] ??
    record['colaboradorNome'] ??
    record['responsavelNome'] ??
    record['collaboratorName'] ??
    ''
  ).trim();
  if (direct) return direct;

  const nested =
    record['colaborador'] ??
    record['responsavel'] ??
    record['responsible'] ??
    record['usuario'] ??
    record['user'] ??
    record['collaborator'] ??
    record['employee'];

  if (typeof nested === 'string') return nested.trim();
  if (nested && typeof nested === 'object') {
    const obj = nested as Record<string, unknown>;
    return String(
      obj['fullName'] ?? obj['full_name'] ?? obj['nome'] ?? obj['name'] ?? ''
    ).trim();
  }

  return '';
}

export function extractProjeto(loan: unknown): string {
  if (!loan || typeof loan !== 'object') return '';
  const record = loan as Record<string, unknown>;
  return String(
    record['helpdeskTicket'] ??
    record['helpdesk_ticket'] ??
    record['helpDeskTicket'] ??
    record['projeto'] ??
    record['project'] ??
    record['ticket'] ??
    record['chamado'] ??
    ''
  ).trim();
}

function activeLoanScore(item: LoanListResponse): number {
  let score = 0;
  const status = normalizeStatusType(item.status);

  if (status === StatusType.EM_MANUTENCAO) {
    score += 50_000;
  }

  if (!item.returnDate) {
    score += 10_000;
  }

  const statusRank: Partial<Record<StatusType, number>> = {
    [StatusType.EM_DEVOLUCAO]: 400,
    [StatusType.EM_USO]: 300,
    [StatusType.EM_PREPARACAO]: 200
  };
  score += statusRank[status as StatusType] ?? 0;

  const loanTime = item.loanDate ? new Date(item.loanDate).getTime() : 0;
  if (!Number.isNaN(loanTime)) {
    score += loanTime / 1e12;
  }

  return score;
}

function matchesEquipmentLoan(
  item: LoanListResponse,
  equipmentId: string,
  codes: string[]
): boolean {
  const eqId = equipmentId.trim();
  const itemEqId = String(item.equipmentId ?? '').trim();
  if (eqId && itemEqId && itemEqId === eqId) return true;

  const itemCode = String(item.codigo ?? '').trim();
  if (!itemCode) return false;
  return codes.some((code) => codesMatch(code, itemCode));
}

/** Escolhe o empréstimo ativo mais relevante para um equipamento. */
export function pickActiveLoanForEquipment(
  loans: LoanListResponse[],
  equipmentId: string,
  tombo?: string
): LoanListResponse | null {
  const eqId = equipmentId.trim();
  if (!eqId && !(tombo ?? '').trim()) return null;

  const codes = [...new Set([tombo].map((c) => String(c ?? '').trim()).filter(Boolean))];

  const linked = (loans ?? []).filter(
    (item) => matchesEquipmentLoan(item, eqId, codes) && !isTerminalLoanStatus(item.status)
  );
  if (linked.length === 0) return null;

  const withActiveStatus = linked.filter((item) => {
    const status = normalizeStatusType(item.status);
    return !!status && ACTIVE_LOAN_STATUSES.has(status);
  });
  const pool = withActiveStatus.length > 0 ? withActiveStatus : linked;

  return pool.reduce((best, current) =>
    activeLoanScore(current) >= activeLoanScore(best) ? current : best
  );
}

export type LoanFormDefaults = {
  responsavel: string;
  projeto: string;
  colaboradorId: string;
};

export function extractLoanFormDefaults(loan: LoanDetailResponse | LoanListResponse | null | undefined): LoanFormDefaults {
  if (!loan) {
    return { responsavel: '', projeto: '', colaboradorId: '' };
  }
  return {
    responsavel: extractColaboradorDisplayName(loan),
    projeto: extractProjeto(loan),
    colaboradorId: extractColaboradorId(loan)
  };
}
