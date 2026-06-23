import { StatusType } from '../status/status-type';

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

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

export interface LoanAcessorioRequest {
  perPartId: string;
  quantity: number;
}

/** @deprecated Use LoanAcessorioRequest */
export type AcessorioLoanInput = LoanAcessorioRequest;

export type LoanType = 'PERSONAL' | 'PROJECT';

export interface LoanRequest {
  equipmentId: string;
  colaboradorId: string;
  loanType: LoanType;
  helpdeskTicket: string;
  loanDate: string;
  returnDate: string | null;
  observation: string | null;
  enviadoSedex: boolean;
  dataSedex: string | null;
  acessorios: LoanAcessorioRequest[];
}

export interface LoanAcessorioResponse {
  perPartId: string;
  name: string;
  quantidadeEmprestada: number;
  originalTotalQuantity: number;
}

/** @deprecated Use LoanAcessorioResponse */
export type LoanAccessoryResponse = LoanAcessorioResponse;

export interface ActiveLoanSummaryResponse {
  id?: string;
  colaboradorId?: string | number;
  responsavel?: string;
  helpdeskTicket?: string;
}

export interface LoanDetailResponse {
  id: string;
  equipmentId?: string;
  loanType?: LoanType;
  /** Alias retornado por alguns endpoints da API */
  tipoEmprestimo?: string;
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
  hasOriginalTerm?: boolean;
  acessorios: LoanAcessorioResponse[];
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

export interface CustodyChangeRequest {
  equipmentIds: string[];
  collaboratorId: string;
  inicioPeriodo: string;
  fimPeriodo?: string | null;
}

export type LoanStatusPatch =
  | 'CANCELADO'
  | 'EMPRESTIMO_FINALIZADO';

export interface CustodiaResponse {
  id: string;
  equipmentId: string;
  custodianteNome: string;
  custodianteId?: string;
  /** Dono estável da cadeia de custódia (não muda ao transferir). Preferir gerenteId/custodyOwnerId. */
  gerenteId?: string;
  custodyOwnerId?: string;
  inicioPeriodo: string;
  fimPeriodo: string | null;
  loanType?: LoanType;
}

export interface ManagerCustodySearchFilters {
  equipmentId?: string;
  nome?: string;
  custodianteId?: string;
  dataInicio?: string;
  dataFim?: string;
  loanType?: LoanType;
}
