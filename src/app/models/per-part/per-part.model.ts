/**
 * Acessórios (PerPart) — persistência Pai/Filho via campo `responsavel`.
 * null = Disponível (Pai) | string = Em Uso (Filho gerado pelo sistema).
 */
export type PerPartAvailabilityStatus = 'DISPONIVEL' | 'EM_USO';

export interface PerPartRequest {
  name: string;
  quantity: number;
  proprietaryId?: string | null;
  dataVencimento?: string | null;
}

export interface PerPartResponse {
  id: string;
  name: string;
  quantity: number;
  responsavel: string | null;
  proprietaryId: string | null;
  proprietaryName: string | null;
  dataVencimento: string | null;
  active: boolean;
  originalTotalQuantity: number;
}

export interface PerPartSearchFilters {
  nome?: string | null;
  responsavel?: string | null;
  status?: PerPartAvailabilityStatus;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}
