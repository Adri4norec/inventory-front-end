export enum StatusType {
  EM_USO = 'EM_USO',
  AGUARDANDO_ASSINATURA = 'AGUARDANDO_ASSINATURA',
  EM_PREPARACAO = 'EM_PREPARACAO',
  DISPONIVEL = 'DISPONIVEL',
  EM_DEVOLUCAO = 'EM_DEVOLUCAO',
  AGUARDANDO_BAIXA = 'AGUARDANDO_BAIXA',
  EM_MANUTENCAO = 'EM_MANUTENCAO',
  INDISPONIVEL = 'INDISPONIVEL'
}

export const STATUS_TYPE_LABEL: Record<StatusType, string> = {
  [StatusType.EM_USO]: 'Em Uso',
  [StatusType.AGUARDANDO_ASSINATURA]: 'Aguardando Assinatura',
  [StatusType.EM_PREPARACAO]: 'Preparação',
  [StatusType.DISPONIVEL]: 'Disponível',
  [StatusType.EM_DEVOLUCAO]: 'Em Devolução',
  [StatusType.AGUARDANDO_BAIXA]: 'Aguardando Baixa',
  [StatusType.EM_MANUTENCAO]: 'Em Manutenção',
  [StatusType.INDISPONIVEL]: 'Indisponível'
};

export type StatusTypeOption = { value: StatusType; label: string };

export const STATUS_TYPE_OPTIONS: StatusTypeOption[] = (Object.values(StatusType) as StatusType[])
  .map((value) => ({ value, label: STATUS_TYPE_LABEL[value] }));

