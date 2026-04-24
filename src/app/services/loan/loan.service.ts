import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanListResponse } from '../../models/loans/loans.model';

@Injectable({ providedIn: 'root' })
export class LoanService {
  // Ajuste para a URL do seu Java
  private apiUrl = 'http://localhost:8080/api/loans'; 

  constructor(private http: HttpClient) {}

  getLoansList(): Observable<LoanListResponse[]> {
    return this.http.get<LoanListResponse[]>(this.apiUrl);
  }
}