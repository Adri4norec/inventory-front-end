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