import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LoanListResponse, EquipmentLoanResponse, UserSearchResponse } from '../../models/loans/loans.model';
import { StatusType } from '../../models/status/status-type';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private readonly apiUrl = 'http://localhost:8080/api/v1/loans';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

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

  getLoanById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`, this.getOptions());
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
        let value = filtros[key];

        // Compatibilidade: backend ainda filtra "PREPARACAO"/"EM_PREPARO" em vez de "EM_PREPARACAO".
        if (key === 'status' && value === StatusType.EM_PREPARACAO) {
          value = 'PREPARACAO';
        }

        params = params.set(mapeamento[key], value);
      }
    });

    return this.http.get<any>(`${this.apiUrl}/advanced-search`, { ...options, params });
  }

  findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.apiUrl}/loan/check/${topo}`, this.getOptions());
  }

  prepareLoan(request: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/loan/prepare`, request, this.getOptions());
  }

  updateLoanStatus(id: string, newStatus: string): Observable<void> {
    const payload = { newStatus };
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, payload, this.getOptions());
  }

  registerReturn(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/return`, {}, this.getOptions());
  }

  registerSupportReturn(loanId: string, photos: File[]): Observable<void> {
    const formData = new FormData();
    photos.forEach((file) => formData.append('files', file));
    return this.http.post<void>(`${this.apiUrl}/devolver-suporte/${loanId}`, formData, this.getOptions());
  }

  finalizeReturnAndReleaseEquipment(loanId: string, signedWriteOffTermPdf: File): Observable<void> {
    const formData = new FormData();
    formData.append('termoBaixa', signedWriteOffTermPdf);
    return this.http.post<void>(`${this.apiUrl}/finalizar-devolucao/${loanId}`, formData, this.getOptions());
  }

  finalizeReturnAndReleaseEquipmentWithDocs(loanId: string, photos: File[], signedWriteOffTermPdf: File): Observable<void> {
    const formData = new FormData();
    photos.forEach((file) => formData.append('files', file));
    formData.append('termoBaixa', signedWriteOffTermPdf);
    return this.http.post<void>(`${this.apiUrl}/finalizar-devolucao/${loanId}`, formData, this.getOptions());
  }

  buscarColaboradores(nome: string): Observable<UserSearchResponse[]> {
    const options = this.getOptions();
    const params = new HttpParams().set('nome', nome);
    return this.http.get<UserSearchResponse[]>(`${this.apiUrl}/search-users`, { ...options, params });
  }

  uploadDocuments(loanId: string, files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<string[]>(`${this.apiUrl}/${loanId}/documents`, formData, this.getOptions());
  }
}