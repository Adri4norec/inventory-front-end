import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanListResponse, EquipmentLoanResponse } from '../../models/loans/loans.model';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  
  // Caminho batendo no Controller do Java que vi na foto (v1)
  private apiUrl = 'http://localhost:8080/api/v1/loans'; 

  constructor(private http: HttpClient) {}

  // MÉTODO SEU (Listagem)
  getLoansList(): Observable<LoanListResponse[]> {
    return this.http.get<LoanListResponse[]>(this.apiUrl);
  }

  // MÉTODO DELE (Busca por Tombo)
  findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.apiUrl}/loan/check/${topo}`);
  }

  // MÉTODO DELE (Salvar Preparação)
  prepareLoan(request: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/loan/prepare`, request);
  }
}