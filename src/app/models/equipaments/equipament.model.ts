import { StatusType } from '../status/status-type';

export type { LoanRequest } from '../loans/loans.model';

export interface EquipmentActiveLoanSummary {
  id?: string;
  colaboradorId?: string;
  fullName?: string;
  helpdeskTicket?: string;
  projeto?: string;
}

export interface EquipmentResponse {
  id: string;
  name: string;
  description: string;
  topo: string;
  codigo: string;
  dateHour: string;
  categoria: string;
  usageType: 'COLABORADOR' | 'INFRAESTRUTURA';
  active: boolean;
  proprietaryName: string;
  statusName: StatusType;
  proprietaryId?: string;
  perParts?: PerPartResponse[];
  imageUrls: string[];
  dueDate?: string;
  /** Empréstimo vigente (campo opcional retornado pelo backend). */
  activeLoanId?: string;
  activeLoan?: EquipmentActiveLoanSummary;
}

export interface EquipmentRequest {
  name: string;
  description: string;
  usageType: string;
  proprietaryId: string;
  topo: string;
  perParts?: PerPartResponse[];
  dueDate?: string | null;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  size: number;
  number: number;
}

export interface PerPartResponse {
  id?: string;
  name: string;
  serialNumber: string;
}

export interface EquipmentLoanResponse {
  id: string;
  name: string;
  description: string;
  statusName: StatusType;
  categoryName: string;
  topo: string;
}
