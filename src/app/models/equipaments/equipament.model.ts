import { StatusType } from '../status/status-type';
import { AcessorioLoanInput } from '../loans/loans.model';

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

export interface LoanRequest {
  equipmentId: string;
  colaboradorId: string;
  loanDate: string;
  returnDate?: string | null;
  helpdeskTicket: string;
  observation: string;
  enviadoSedex?: boolean;
  dataSedex?: string | null;
  acessorios?: AcessorioLoanInput[];
}