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

function hasFutureEnd(item: CustodiaResponse): boolean {
  if (!item?.fimPeriodo) return false;
  const fim = parseCustodyDate(item.fimPeriodo)?.getTime();
  return fim != null && fim >= Date.now();
}

/**
 * Custodiante vigente do equipamento (responsável atual do período ativo).
 */
export function pickCurrentCustodianMovement(movements: CustodiaResponse[]): CustodiaResponse | null {
  if (!movements.length) return null;

  const withFutureEnd = movements.filter((item) => hasFutureEnd(item));
  if (withFutureEnd.length > 0) {
    return [...withFutureEnd].sort((a, b) => compareCustodyRecency(b, a))[0];
  }

  const openEnded = movements.filter((item) => !item?.fimPeriodo);
  if (openEnded.length > 0) {
    return [...openEnded].sort((a, b) => compareCustodyRecency(b, a))[0];
  }

  return [...movements].sort((a, b) => compareCustodyRecency(b, a))[0] ?? null;
}

/**
 * Responsável original designado no empréstimo projeto (primeiro custodiante da cadeia).
 * Apenas essa pessoa visualiza lista e histórico, mesmo após transferências de custódia.
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

  const projectMovements = group.filter((item) => readLoanType(item) === 'PROJECT');
  const pool = projectMovements.length > 0 ? projectMovements : group;

  return [...pool].sort(compareCustodyRecency)[0] ?? null;
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

export interface CustodyViewerRef {
  userId: string | null;
  names: Set<string>;
}

/** Índice de quem pode ver lista/histórico: responsável original (movimentação mais antiga). */
export function buildCustodyViewerIndex(
  movements: CustodiaResponse[]
): Map<string, CustodyViewerRef> {
  const byEquipment = new Map<string, CustodiaResponse[]>();

  for (const item of movements) {
    const key = String(item?.equipmentId ?? '').trim();
    if (!key) continue;
    const group = byEquipment.get(key) ?? [];
    group.push(item);
    byEquipment.set(key, group);
  }

  const index = new Map<string, CustodyViewerRef>();

  byEquipment.forEach((group, equipmentId) => {
    const stableOwnerIds = [
      ...new Set(group.map(readStableCustodyOwnerId).filter((id): id is string => !!id))
    ];
    if (stableOwnerIds.length === 1) {
      index.set(equipmentId, { userId: stableOwnerIds[0], names: new Set() });
      return;
    }

    const owner = resolveCustodyOwnerMovement(group);
    const userId = String(owner?.custodianteId ?? '').trim();
    const names = new Set<string>();
    const name = normalizePersonName(owner?.custodianteNome);
    if (name) names.add(name);

    index.set(equipmentId, {
      userId: userId && UUID_RE.test(userId) ? userId : null,
      names
    });
  });

  return index;
}

export function isLoggedUserCustodyViewerByIndex(
  equipmentId: string,
  loggedId: string | null,
  loggedNames: Set<string>,
  viewerIndex: Map<string, CustodyViewerRef>
): boolean {
  const ref = viewerIndex.get(equipmentId);
  if (!ref) return false;

  if (loggedId && ref.userId && loggedId === ref.userId) {
    return true;
  }

  for (const name of ref.names) {
    if (loggedNames.has(name)) return true;
  }

  return false;
}

export function getCustodyItemLookupKeys(item: CustodiaResponse): string[] {
  return [
    ...new Set(
      [String(item?.equipmentId ?? '').trim(), String(item?.id ?? '').trim()].filter(Boolean)
    )
  ];
}

export function isLoggedUserAllowedToViewCustodyItem(
  item: CustodiaResponse,
  loggedId: string | null,
  loggedNames: Set<string>,
  viewerIndex: Map<string, CustodyViewerRef>,
  pins: Map<string, string>
): boolean {
  const keys = getCustodyItemLookupKeys(item);

  for (const key of keys) {
    const pinnedUserId = pins.get(key);
    if (pinnedUserId) {
      return !!loggedId && pinnedUserId === loggedId;
    }
  }

  for (const key of keys) {
    if (isLoggedUserCustodyViewerByIndex(key, loggedId, loggedNames, viewerIndex)) {
      return true;
    }
  }

  return false;
}

function hasExplicitViewerForGroup(
  equipmentKey: string,
  group: CustodiaResponse[],
  viewerIndex: Map<string, CustodyViewerRef>,
  pins: Map<string, string>
): boolean {
  for (const item of group) {
    for (const key of getCustodyItemLookupKeys(item)) {
      if (pins.has(key)) return true;
    }
  }

  if (viewerIndex.has(equipmentKey)) return true;

  for (const item of group) {
    const loanId = String(item?.id ?? '').trim();
    if (loanId && viewerIndex.has(loanId)) return true;
  }

  return false;
}

function isEquipmentVisibleToLoggedUser(
  equipmentKey: string,
  group: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>,
  viewerIndex: Map<string, CustodyViewerRef>,
  pins: Map<string, string>
): boolean {
  for (const item of group) {
    for (const key of getCustodyItemLookupKeys(item)) {
      const pinnedUserId = pins.get(key);
      if (pinnedUserId) {
        return !!loggedId && pinnedUserId === loggedId;
      }
    }
  }

  if (isLoggedUserCustodyViewerByIndex(equipmentKey, loggedId, loggedNames, viewerIndex)) {
    return true;
  }

  for (const item of group) {
    const loanId = String(item?.id ?? '').trim();
    if (loanId && isLoggedUserCustodyViewerByIndex(loanId, loggedId, loggedNames, viewerIndex)) {
      return true;
    }
  }

  // Cadeia com transferência: responsável original = movimentação mais antiga.
  if (group.length > 1 && isLoggedUserCustodyOwner(group, loggedId, loggedNames)) {
    return true;
  }

  // Sem pin/índice: custodiante designado vê; originador do empréstimo não.
  if (!hasExplicitViewerForGroup(equipmentKey, group, viewerIndex, pins)) {
    return isLoggedUserCurrentCustodian(group, loggedId, loggedNames);
  }

  return false;
}

export function filterMovementsByViewerIndex(
  movements: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>,
  viewerIndex: Map<string, CustodyViewerRef>,
  pins: Map<string, string>
): CustodiaResponse[] {
  const byEquipment = new Map<string, CustodiaResponse[]>();

  for (const item of movements) {
    const key = String(item?.equipmentId ?? '').trim();
    if (!key) continue;
    const group = byEquipment.get(key) ?? [];
    group.push(item);
    byEquipment.set(key, group);
  }

  const allowedEquipment = new Set<string>();

  byEquipment.forEach((group, equipmentKey) => {
    if (isEquipmentVisibleToLoggedUser(
      equipmentKey,
      group,
      loggedId,
      loggedNames,
      viewerIndex,
      pins
    )) {
      allowedEquipment.add(equipmentKey);
    }
  });

  return movements.filter((item) => {
    const key = String(item?.equipmentId ?? '').trim();
    return key && allowedEquipment.has(key);
  });
}

export function mergeCustodyViewerIndex(
  base: Map<string, CustodyViewerRef>,
  pins: Map<string, string>
): Map<string, CustodyViewerRef> {
  const merged = new Map(base);
  pins.forEach((userId, equipmentId) => {
    merged.set(equipmentId, { userId, names: new Set() });
  });
  return merged;
}

/** Mescla índices na ordem de prioridade (primeiro tem precedência, pins sobrescrevem depois). */
export function mergeViewerIndexes(
  ...indexes: Map<string, CustodyViewerRef>[]
): Map<string, CustodyViewerRef> {
  const merged = new Map<string, CustodyViewerRef>();
  for (const index of indexes) {
    index.forEach((ref, equipmentId) => {
      if (!merged.has(equipmentId)) {
        merged.set(equipmentId, ref);
      }
    });
  }
  return merged;
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

/** Alias semântico: o logado é quem tem direito de ver lista/histórico desta custódia. */
export function isLoggedUserCustodyViewer(
  group: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): boolean {
  return isLoggedUserCustodyOwner(group, loggedId, loggedNames);
}

/** O usuário logado é o custodiante vigente do equipamento (ex.: Victor após empréstimo projeto). */
export function isLoggedUserCurrentCustodian(
  group: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): boolean {
  const current = pickCurrentCustodianMovement(group);
  if (!current) return false;

  return isPersonMatchingLoggedUser(
    current.custodianteNome,
    current.custodianteId,
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

/** Listagem da Área do Gerente: exibe equipamentos cuja custódia vigente pertence ao usuário logado. */
export function filterMovementsForLoggedCustodian(
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

  const custodianKeys = new Set<string>();
  byEquipment.forEach((group, key) => {
    if (isLoggedUserCurrentCustodian(group, loggedId, loggedNames)) {
      custodianKeys.add(key);
    }
  });

  return movements.filter((item) => {
    const key = String(item?.equipmentId ?? '').trim();
    return key && custodianKeys.has(key);
  });
}

/**
 * Listagem/histórico: exibe apenas para o responsável original do empréstimo projeto.
 * Transferências atualizam o custodiante exibido, mas não transferem a visibilidade.
 */
export function isLoggedUserCustodyListParticipant(
  group: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): boolean {
  return isLoggedUserCustodyViewer(group, loggedId, loggedNames);
}

export function filterMovementsForCustodyList(
  movements: CustodiaResponse[],
  loggedId: string | null,
  loggedNames: Set<string>
): CustodiaResponse[] {
  return filterMovementsForLoggedCustodyOwner(movements, loggedId, loggedNames);
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
    const current = pickCurrentCustodianMovement(group);

    diagnostics.push({
      equipmentId,
      movementCount: group.length,
      resolvedOwner: String(owner?.custodianteNome ?? '-'),
      currentCustodian: String(current?.custodianteNome ?? '-'),
      visibleToLoggedUser: isLoggedUserCustodyViewer(group, loggedId, loggedNames),
      stableOwnerIds: [
        ...new Set(group.map(readStableCustodyOwnerId).filter((id): id is string => !!id))
      ]
    });
  });

  return diagnostics;
}
