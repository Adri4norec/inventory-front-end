import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EquipmentLoanResponse,
  LoanDetailResponse,
  LoanListResponse,
  LoanRequest,
  LoanStatusPatch,
  CustodiaResponse,
  CustodyChangeRequest,
  ManagerCustodySearchFilters,
  PageResponse,
  UserSearchResponse
} from '../../models/loans/loans.model';
import { StatusType } from '../../models/status/status-type';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private readonly apiUrl = `${environment.apiUrl}/api/v1/loans`;

  static readonly PATCH_FORBIDDEN_STATUSES = new Set<string>([
    StatusType.EM_DEVOLUCAO,
    'DEVOLVIDO'
  ]);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  private getOptions(extra?: { headers?: HttpHeaders }) {
    let headers = extra?.headers ?? new HttpHeaders();

    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return { headers };
  }

  getLoansList(): Observable<LoanListResponse[]> {
    return this.http.get<LoanListResponse[]>(this.apiUrl, this.getOptions());
  }

  getLoanById(id: string): Observable<LoanDetailResponse> {
    return this.http.get<LoanDetailResponse>(`${this.apiUrl}/${id}`, this.getOptions());
  }

  advancedSearch(
    filtros: Record<string, string | string[] | undefined>,
    page: number,
    size: number
  ): Observable<PageResponse<LoanListResponse>> {
    const options = this.getOptions();

    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const mapeamento: Record<string, string> = {
      codigo: 'tombo',
      categoria: 'categoria',
      nome: 'nome',
      caracteristicas: 'caracteristicas'
    };

    Object.keys(mapeamento).forEach((key) => {
      const value = filtros[key];
      if (typeof value === 'string' && value) {
        params = params.set(mapeamento[key], value);
      }
    });

    const selectedStatuses = (filtros['statuses'] as string[] | undefined) ?? [];
    if (selectedStatuses.length > 0) {
      selectedStatuses.forEach((statusValue: string) => {
        let mapped = statusValue;
        if (statusValue === StatusType.EM_PREPARACAO) {
          mapped = 'PREPARACAO';
        }
        params = params.append('status', mapped);
      });
    }

    return this.http.get<PageResponse<LoanListResponse>>(`${this.apiUrl}/advanced-search`, { ...options, params });
  }

  getManagerCustody(managerId: string, page: number, size: number): Observable<PageResponse<CustodiaResponse>> {
    const options = this.getOptions();
    const params = new HttpParams()
      .set('managerId', managerId)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<PageResponse<CustodiaResponse>>(`${this.apiUrl}/manager-custody`, { ...options, params });
  }

  managerCustodyAdvancedSearch(
    managerId: string,
    filtros: ManagerCustodySearchFilters,
    page: number,
    size: number
  ): Observable<PageResponse<CustodiaResponse>> {
    const options = this.getOptions();
    let params = new HttpParams()
      .set('managerId', managerId)
      .set('page', page.toString())
      .set('size', size.toString());

    const equipmentId = filtros.equipmentId?.trim();
    const nome = filtros.nome?.trim();
    if (equipmentId) params = params.set('equipmentId', equipmentId);
    if (nome) params = params.set('nome', nome);
    if (filtros.dataInicio) params = params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params = params.set('dataFim', filtros.dataFim);
    if (filtros.loanType) params = params.set('loanType', filtros.loanType);

    return this.http.get<PageResponse<CustodiaResponse>>(
      `${this.apiUrl}/manager-custody/advanced-search`,
      { ...options, params }
    );
  }

  isManagerCustodyAdvancedSearchUnavailable(err: unknown): boolean {
    if (!(err instanceof HttpErrorResponse)) return false;
    if (err.status === 404) return true;
    if (err.status !== 500) return false;

    const body = err.error as { message?: string; exception?: string } | null;
    const message = String(body?.message ?? '');
    const exception = String(body?.exception ?? '');
    return (
      message.includes('No static resource') ||
      message.includes('manager-custody/advanced-search') ||
      exception.includes('NoResourceFoundException')
    );
  }

  findByCodeToLoan(topo: string): Observable<EquipmentLoanResponse> {
    return this.http.get<EquipmentLoanResponse>(`${this.apiUrl}/loan/check/${topo}`, this.getOptions());
  }

  prepareLoan(request: LoanRequest): Observable<LoanDetailResponse> {
    return this.http.post<LoanDetailResponse>(`${this.apiUrl}/loan/prepare`, request, this.getOptions());
  }

  updateLoanStatus(id: string, newStatus: LoanStatusPatch | string): Observable<void> {
    if (LoanService.PATCH_FORBIDDEN_STATUSES.has(String(newStatus))) {
      throw new Error(
        'Status EM_DEVOLUCAO e DEVOLVIDO só podem ser atingidos pelo fluxo de devolução (fotos + termo PDF).'
      );
    }
    const payload = { newStatus };
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, payload, this.getOptions());
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

  downloadOriginalTerm(loanId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/download-original/${loanId}`, {
      ...this.getOptions(),
      responseType: 'blob',
    });
  }

  buscarColaboradores(nome: string): Observable<UserSearchResponse[]> {
    const options = this.getOptions();
    const params = new HttpParams().set('nome', nome);
    return this.http.get<UserSearchResponse[]>(`${this.apiUrl}/search-users`, { ...options, params });
  }

  changeCustodyInBatch(request: CustodyChangeRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/change-custody`, request, this.getOptions());
  }

  uploadDocuments(loanId: string, files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<string[]>(`${this.apiUrl}/${loanId}/documents`, formData, this.getOptions());
  }
}
