export enum StatusType {
  EM_USO = 'EM_USO',
  EM_PREPARACAO = 'EM_PREPARACAO',
  DISPONIVEL = 'DISPONIVEL',
  EM_DEVOLUCAO = 'EM_DEVOLUCAO',
  EM_MANUTENCAO = 'EM_MANUTENCAO',
  INDISPONIVEL = 'INDISPONIVEL'
}

export const STATUS_TYPE_LABEL: Record<StatusType, string> = {
  [StatusType.EM_USO]: 'Em Uso',
  [StatusType.EM_PREPARACAO]: 'Em Preparação',
  [StatusType.DISPONIVEL]: 'Disponível',
  [StatusType.EM_DEVOLUCAO]: 'Em Devolução',
  [StatusType.EM_MANUTENCAO]: 'Em Manutenção',
  [StatusType.INDISPONIVEL]: 'Indisponível'
};

export type StatusTypeOption = { value: StatusType; label: string };

export const STATUS_TYPE_OPTIONS: StatusTypeOption[] = (Object.values(StatusType) as StatusType[])
  .map((value) => ({ value, label: STATUS_TYPE_LABEL[value] }));

export type StatusColorKey = 'green' | 'orange' | 'blue' | 'gray' | 'purple';

export const STATUS_TYPE_COLOR: Record<StatusType, StatusColorKey> = {
  [StatusType.DISPONIVEL]: 'green',
  [StatusType.EM_PREPARACAO]: 'orange',
  [StatusType.EM_USO]: 'blue',
  [StatusType.INDISPONIVEL]: 'gray',
  [StatusType.EM_DEVOLUCAO]: 'purple',
  [StatusType.EM_MANUTENCAO]: 'purple'
};

export function statusColorClass(raw: unknown): string {
  const st = normalizeStatusType(raw);
  if (!st) return 'status-gray';
  return `status-${STATUS_TYPE_COLOR[st]}`;
}

export function formatStatusLabel(raw: unknown): string {
  const type = normalizeStatusType(raw);
  
  if (type && STATUS_TYPE_LABEL[type]) {
    return STATUS_TYPE_LABEL[type];
  }

  return formatFallbackLabel(raw);
}

function formatFallbackLabel(raw: unknown): string {
  const value = String(raw || '').trim();
  if (!value) return '-';

  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase()); 
}

export function normalizeStatusType(raw: unknown): StatusType | null {
  if (!raw) return null;
  
  const value = String(raw).trim().toUpperCase();
  
  const synonyms: Record<string, StatusType> = {
    'PREPARACAO': StatusType.EM_PREPARACAO,
    'EM_PREPARO': StatusType.EM_PREPARACAO
  };

  return synonyms[value] || (Object.values(StatusType).includes(value as StatusType) ? (value as StatusType) : null);
}

