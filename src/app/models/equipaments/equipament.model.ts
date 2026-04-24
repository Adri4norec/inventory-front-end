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
  statusName: string;
  proprietaryId?: string;
  perParts?: PerPartResponse[];
  imageUrls: string[];
}

export interface EquipmentRequest {
  name: string;
  description: string;
  usageType: string;
  proprietaryId: string;
  topo: string;
  perParts?: PerPartResponse[];
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
  statusName: string;
  categoryName: string;
  topo: string;
}

export interface LoanRequest {
  equipmentId: string;
  colaboradorId: string;
  loanDate: string;
  helpdeskTicket: string;
  observation: string;
}