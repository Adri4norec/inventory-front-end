import { StatusType } from '../status/status-type';
import { ActiveLoanSummaryResponse } from '../loans/loans.model';

export type { LoanRequest } from '../loans/loans.model';

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
  activeLoanId?: string;
  activeLoan?: ActiveLoanSummaryResponse;
}

export interface CategoryRequest {
  name: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
}

export interface EquipmentRequest {
  name: string;
  description: string;
  usageType: string;
  proprietaryId: string;
  categoryId: string;
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
