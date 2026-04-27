import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanListResponse, EquipmentLoanResponse } from '../../models/loans/loans.model';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private apiUrl = 'http://localhost:8080/api/v1/loans';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  getLoansList(): Observable<LoanListResponse[]> {
    let headers: any = {};
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return this.http.get<LoanListResponse[]>(this.apiUrl, { headers });
  }

  advancedSearch(filtros: any, page: number, size: number): Observable<any> {
    let headers: any = {};
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filtros.codigo) params = params.set('tombo', filtros.codigo);
    if (filtros.categoria) params = params.set('categoria', filtros.categoria);
    if (filtros.nome) params = params.set('nome', filtros.nome);
    if (filtros.caracteristicas) params = params.set('caracteristicas', filtros.caracteristicas);
    if (filtros.status) params = params.set('status', filtros.status);

    return this.http.get<any>(`${this.apiUrl}/advanced-search`, { headers, params });
  }

  findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.apiUrl}/loan/check/${topo}`);
  }

  prepareLoan(request: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/loan/prepare`, request);
  }

  // No loan.service.ts
  buscarColaboradores(nome: string): Observable<any[]> {
    const params = new HttpParams().set('nome', nome);
    return this.http.get<any[]>(`${this.apiUrl}/users/search`, { params });
  }
}