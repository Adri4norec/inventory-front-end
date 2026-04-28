import { SafeResourceUrl } from '@angular/platform-browser';

// A SUA INTERFACE (Listagem)
export interface LoanListResponse {
  id: string;
  codigo: string;
  categoria: string;
  name: string;
  description: string;
  status: string;
  loanDate?: string;
  returnDate?: string;
  equipmentId?: string;
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
}

// A INTERFACE DELE (Preparação/Busca)
export interface EquipmentLoanResponse {
  id: string;
  name: string;
  description: string;
  statusName: string;
  categoryName: string;
  topo: number;
}

export enum LoanType {
  EM_PREPARACAO = 'Em Preparação',
  AUARDANDO_ASSINATURA = 'Aguardando Assinatura',
  EM_USO = 'Em Uso'
}

export interface UserSearchResponse {
    id: string;       
    fullName: string; 
}