import { StatusType } from '../status/status-type';

export interface LoanListResponse {
  id: string;
  codigo: string;
  categoria: string;
  name: string;
  description: string;
  status: string;
  hasLoanHistory?: boolean;
  loanDate?: string;
  expectedReturnDate?: string;
  returnDate?: string;
  equipmentId?: string;
  enviadoSedex?: boolean;
  dataSedex?: string;
  proprietaryName?: string;
  usageType?: string;
  dateHour?: string;
}

export interface LoanDetailResponse {
  id: string;
  equipmentId?: string;
  status?: string;
  loanDate?: string;
  expectedReturnDate?: string;
  returnDate?: string;
  helpdeskTicket?: string;
  project?: string;
  colaboradorId?: string;
  responsavel?: string | { id?: string; fullName?: string };
  fullName?: string;
  observation?: string;
  proprietario?: string;
  usageType?: string;
  dateHour?: string;
  enviadoSedex?: boolean;
  dataSedex?: string;
}

export interface EquipmentLoanResponse {
  id: string;
  name: string;
  description: string;
  statusName: StatusType;
  categoryName: string;
  topo: number;
}

export interface UserSearchResponse {
    id: string;       
    fullName: string; 
}