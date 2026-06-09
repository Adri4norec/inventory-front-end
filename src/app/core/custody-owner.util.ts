import { CustodiaResponse, LoanType } from '../models/loans/loans.model';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePersonName(value?: string | null): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function readLoanType(item: CustodiaResponse): LoanType | null {
  const record = item as CustodiaResponse & { tipoEmprestimo?: string };
  const raw = record.loanType ?? record.tipoEmprestimo;
  if (!raw) return null;

  const normalized = String(raw).trim().toUpperCase();
  if (normalized === 'PROJECT' || normalized === 'PROJETO') return 'PROJECT';
  if (normalized === 'PERSONAL' || normalized === 'PESSOAL') return 'PERSONAL';
  return null;
}

export function readStableCustodyOwnerId(item: CustodiaResponse): string | null {
  const record = item as CustodiaResponse & {
    gerenteId?: string;
    custodyOwnerId?: string;
  };

  for (const value of [record.custodyOwnerId, record.gerenteId]) {
    const id = String(value ?? '').trim();
    if (UUID_RE.test(id)) return id;
  }

  return null;
}

function parseCustodyDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function compareCustodyRecency(a: CustodiaResponse, b: CustodiaResponse): number {
  const aTime = parseCustodyDate(a?.inicioPeriodo)?.getTime();
  const bTime = parseCustodyDate(b?.inicioPeriodo)?.getTime();

  if (aTime != null && bTime != null && aTime !== bTime) {
    return aTime - bTime;
  }
  if (aTime != null && bTime == null) return 1;
  if (aTime == null && bTime != null) return -1;

  const aEnd = a?.fimPeriodo ? parseCustodyDate(a.fimPeriodo)?.getTime() ?? 0 : Number.POSITIVE_INFINITY;
  const bEnd = b?.fimPeriodo ? parseCustodyDate(b.fimPeriodo)?.getTime() ?? 0 : Number.POSITIVE_INFINITY;
  if (aEnd !== bEnd) return aEnd - bEnd;

  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

function isEndedCustody(item: CustodiaResponse): boolean {
  if (!item?.fimPeriodo) return false;
  const fim = parseCustodyDate(item.fimPeriodo)?.getTime();
  return fim != null && fim <= Date.now();
}

/**
 * Dono da custódia na Área do Gerente.
 * Após transferência, o dono permanece quem originou a cadeia (ex.: Jansey),
 * mesmo que o custodiante vigente seja outro (ex.: Victor).
 */
export function resolveCustodyOwnerMovement(group: CustodiaResponse[]): CustodiaResponse | null {
  if (!group.length) return null;

  const stableOwnerIds = [
    ...new Set(group.map(readStableCustodyOwnerId).filter((id): id is string => !!id))
  ];
  if (stableOwnerIds.length === 1) {
    const ownerId = stableOwnerIds[0];
    const byId = group.find((item) => String(item.custodianteId ?? '').trim() === ownerId);
    if (byId) return byId;
  }

  // Transferência encerra o período anterior: o dono é quem consta na movimentação encerrada.
  const endedMovements = group.filter(isEndedCustody);
  if (endedMovements.length > 0) {
    return [...endedMovements].sort(compareCustodyRecency)[0];
  }

  const projectMovements = group.filter((item) => readLoanType(item) === 'PROJECT');
  if (projectMovements.length > 0) {
    return [...projectMovements].sort(compareCustodyRecency)[0];
  }

  return [...group].sort(compareCustodyRecency)[0] ?? null;
}

function isPersonMatchingLoggedUser(
  nome: string | null | undefined,
  id: string | null | undefined,
  loggedId: string | null,
  loggedNames: Set<string>
): boolean {
  const personId = String(id ?? '').trim();
  if (loggedId && personId && UUID_RE.test(personId)) {
    return personId === loggedId;
  }

  const name = normalizePersonName(nome);
  return !!name && loggedNames.has(name);
}

export function isLoggedUserCustodyOwner(
  group: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): boolean {
  const ownerMovement = resolveCustodyOwnerMovement(group);
  if (!ownerMovement) return false;

  return isPersonMatchingLoggedUser(
    ownerMovement.custodianteNome,
    ownerMovement.custodianteId,
    loggedId,
    loggedNames
  );
}

export function filterMovementsForLoggedCustodyOwner(
  movements: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): CustodiaResponse[] {
  const byEquipment = new Map<string, CustodiaResponse[]>();

  for (const item of movements) {
    const key = String(item?.equipmentId ?? '').trim();
    if (!key) continue;
    const group = byEquipment.get(key) ?? [];
    group.push(item);
    byEquipment.set(key, group);
  }

  const ownedKeys = new Set<string>();
  byEquipment.forEach((group, key) => {
    if (isLoggedUserCustodyOwner(group, loggedId, loggedNames)) {
      ownedKeys.add(key);
    }
  });

  return movements.filter((item) => {
    const key = String(item?.equipmentId ?? '').trim();
    return key && ownedKeys.has(key);
  });
}

export interface CustodyScopeDiagnostic {
  equipmentId: string;
  movementCount: number;
  resolvedOwner: string;
  currentCustodian: string;
  visibleToLoggedUser: boolean;
  stableOwnerIds: string[];
}

/** Diagnóstico (dev): ajuda a distinguir falha de API vs filtro do frontend. */
export function diagnoseCustodyScope(
  movements: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): CustodyScopeDiagnostic[] {
  const byEquipment = new Map<string, CustodiaResponse[]>();

  for (const item of movements) {
    const key = String(item?.equipmentId ?? '').trim();
    if (!key) continue;
    const group = byEquipment.get(key) ?? [];
    group.push(item);
    byEquipment.set(key, group);
  }

  const diagnostics: CustodyScopeDiagnostic[] = [];

  byEquipment.forEach((group, equipmentId) => {
    const owner = resolveCustodyOwnerMovement(group);
    const current = [...group].sort((a, b) => compareCustodyRecency(b, a))[0];

    diagnostics.push({
      equipmentId,
      movementCount: group.length,
      resolvedOwner: String(owner?.custodianteNome ?? '-'),
      currentCustodian: String(current?.custodianteNome ?? '-'),
      visibleToLoggedUser: isLoggedUserCustodyOwner(group, loggedId, loggedNames),
      stableOwnerIds: [
        ...new Set(group.map(readStableCustodyOwnerId).filter((id): id is string => !!id))
      ]
    });
  });

  return diagnostics;
}
