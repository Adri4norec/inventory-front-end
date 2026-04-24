import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EquipmentLoanResponse, LoanRequest } from '../../models/equipaments/equipament.model';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoanService {
  // Ajuste para a URL do seu Java
  private apiUrl = 'http://localhost:8080/api/loans'; 

  constructor(private http: HttpClient) {}

  private readonly API = 'http://localhost:8080/api/v1/loans';
  
    constructor(private http: HttpClient) { }

    findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.API}/loan/check/${topo}`);
  }

  saveLoanPreparation(loan: LoanRequest): Observable<any> {
    return this.http.post(`${this.API}/loan/prepare`, loan);
  }
}