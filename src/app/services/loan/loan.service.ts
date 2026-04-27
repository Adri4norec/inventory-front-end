import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanListResponse, EquipmentLoanResponse, UserSearchResponse } from '../../models/loans/loans.model';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private readonly apiUrl = 'http://localhost:8080/api/v1/loans';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  /**
   * Método privado para centralizar a criação dos headers com Token.
   * Evita repetição de código em todos os métodos do service.
   */
  private getOptions() {
    let headers = new HttpHeaders();

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return { headers };
  }

  getLoansList(): Observable<LoanListResponse[]> {
    return this.http.get<LoanListResponse[]>(this.apiUrl, this.getOptions());
  }

  advancedSearch(filtros: any, page: number, size: number): Observable<any> {
    const options = this.getOptions();

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const mapeamento: { [key: string]: string } = {
      codigo: 'tombo',
      categoria: 'categoria',
      nome: 'nome',
      caracteristicas: 'caracteristicas',
      status: 'status'
    };

    Object.keys(mapeamento).forEach(key => {
      if (filtros[key]) {
        params = params.set(mapeamento[key], filtros[key]);
      }
    });

    return this.http.get<any>(`${this.apiUrl}/advanced-search`, { ...options, params });
  }

  findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.apiUrl}/loan/check/${topo}`, this.getOptions());
  }

  prepareLoan(request: any): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/loan/prepare`, request, this.getOptions());
  }

  updateLoanStatus(id: string, newStatus: string): Observable<void> {
    const payload = { newStatus };
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, payload, this.getOptions());
  }

  registerReturn(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/return`, {}, this.getOptions());
  }

  buscarColaboradores(nome: string): Observable<UserSearchResponse[]> {
    const params = new HttpParams().set('nome', nome);
    return this.http.get<UserSearchResponse[]>(`${this.apiUrl}/loans/search-users`, { params });
}
}