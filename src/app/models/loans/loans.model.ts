export interface LoanResponse {
  id: string; 
  equipamentId: string;
  codigo: string; 
  categoria: string;
  name: string;
  description: string;
  status: string; // 'DISPONIVEL' ou 'EM_USO'
  loanDate?: string; 
  expectedReturnDate?: string;
  responsibleName?: string; 
}