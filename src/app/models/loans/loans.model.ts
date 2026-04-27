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
  expectedReturnDate?: string;
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
  EM_PREPARACAO = 'EM_PREPARACAO',
  AUARDANDO_ASSINATURA = 'AUARDANDO_ASSINATURA',
  EM_USO = 'EM_USO'
}