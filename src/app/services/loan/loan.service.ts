import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, tap, switchMap, catchError } from 'rxjs/operators';
import {
  EquipmentLoanResponse,
  LoanDetailResponse,
  LoanListResponse,
  LoanRequest,
  LoanType,
  LoanStatusPatch,
  CustodiaResponse,
  CustodyChangeRequest,
  ManagerCustodySearchFilters,
  PageResponse,
  UserSearchResponse
} from '../../models/loans/loans.model';
import { StatusType } from '../../models/status/status-type';
import { environment } from '../../../environments/environment';
import { LoanTypeCacheService } from './loan-type-cache.service';
import { pickActiveLoanForEquipment } from '../../core/loan-form.util';

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
    private loanTypeCache: LoanTypeCacheService,
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
    return this.http.get<LoanDetailResponse>(`${this.apiUrl}/${id}`, this.getOptions()).pipe(
      map((loan) => this.enrichLoanWithType(loan))
    );
  }

  /**
   * GET /loans/active-by-equipment/{equipmentId}
   * Retorna null em 404 (sem empréstimo vigente) ou se o endpoint ainda não existir.
   */
  getActiveLoanByEquipment(equipmentId: string): Observable<LoanDetailResponse | null> {
    const id = equipmentId.trim();
    if (!id) return of(null);

    return this.http
      .get<LoanDetailResponse>(`${this.apiUrl}/active-by-equipment/${id}`, this.getOptions())
      .pipe(
        map((loan) => this.enrichLoanWithType(loan)),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 204)) {
            return of(null);
          }
          return of(null);
        })
      );
  }

  /**
   * Busca o empréstimo ativo vinculado ao equipamento.
   * Ordem: loanId conhecido → endpoint dedicado → busca legada (advanced-search / lista).
   */
  findActiveLoanByEquipment(
    equipmentId: string,
    tombo?: string,
    altCode?: string,
    preferredLoanId?: string
  ): Observable<LoanDetailResponse | null> {
    const loanId = (preferredLoanId ?? '').trim();
    if (loanId) {
      return this.getLoanById(loanId).pipe(catchError(() => of(null)));
    }

    const eqId = equipmentId.trim();
    if (!eqId && !(tombo ?? '').trim() && !(altCode ?? '').trim()) {
      return of(null);
    }

    const dedicated$ = eqId
      ? this.getActiveLoanByEquipment(eqId)
      : of(null);

    return dedicated$.pipe(
      switchMap((loan) => (loan ? of(loan) : this.findActiveLoanByEquipmentLegacy(eqId, tombo, altCode)))
    );
  }

  /** Fallback quando GET /active-by-equipment não existe ou não retorna resultado. */
  private findActiveLoanByEquipmentLegacy(
    equipmentId: string,
    tombo?: string,
    altCode?: string
  ): Observable<LoanDetailResponse | null> {
    const codes = [...new Set([tombo, altCode].map((c) => String(c ?? '').trim()).filter(Boolean))];
    const searches: Observable<LoanListResponse[]>[] = codes.map((code) =>
      this.advancedSearch({ codigo: code }, 0, 50).pipe(
        map((res) => res.content ?? []),
        catchError(() => of([] as LoanListResponse[]))
      )
    );

    searches.push(
      this.advancedSearch(
        {
          statuses: [StatusType.EM_USO, StatusType.EM_PREPARACAO, StatusType.EM_DEVOLUCAO]
        },
        0,
        200
      ).pipe(
        map((res) => res.content ?? []),
        catchError(() => of([] as LoanListResponse[]))
      )
    );

    searches.push(
      this.getLoansList().pipe(
        map((list) => (Array.isArray(list) ? list : [])),
        catchError(() => of([] as LoanListResponse[]))
      )
    );

    const pickFromMerged = (lists: LoanListResponse[][]): LoanListResponse | null => {
      const merged = new Map<string, LoanListResponse>();
      for (const list of lists) {
        for (const item of list) {
          merged.set(item.id, item);
        }
      }
      const all = [...merged.values()];
      for (const code of codes) {
        const picked = pickActiveLoanForEquipment(all, equipmentId, code);
        if (picked) return picked;
      }
      return pickActiveLoanForEquipment(all, equipmentId);
    };

    return forkJoin(searches).pipe(
      map((results) => pickFromMerged(results)),
      switchMap((summary) => {
        if (!summary?.id) return of(null);
        return this.getLoanById(summary.id).pipe(
          map((detail) => ({ ...summary, ...detail } as LoanDetailResponse)),
          catchError(() => of(summary as unknown as LoanDetailResponse))
        );
      }),
      catchError(() => of(null))
    );
  }

  rememberLoanType(loanId: string, loanType: LoanType): void {
    this.loanTypeCache.remember(loanId, loanType);
  }

  /** Preenche loanType a partir da API ou do cache local (GET ainda não devolve o campo). */
  private enrichLoanWithType(loan: LoanDetailResponse | null | undefined): LoanDetailResponse {
    const safe =
      loan && typeof loan === 'object' ? loan : ({} as LoanDetailResponse);

    const fromApi = this.parseLoanType(safe);
    if (fromApi) {
      if (safe.id) {
        this.loanTypeCache.remember(safe.id, fromApi);
      }
      return { ...safe, loanType: fromApi };
    }

    const cached = safe.id ? this.loanTypeCache.get(safe.id) : null;
    return cached ? { ...safe, loanType: cached } : safe;
  }

  private parseLoanType(source: unknown): LoanType | null {
    if (!source || typeof source !== 'object') return null;
    const record = source as Record<string, unknown>;
    const raw =
      record['loanType'] ??
      record['tipoEmprestimo'] ??
      record['tipo_emprestimo'] ??
      record['loan_type'];
    if (raw == null) return null;
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      return this.parseLoanType({ loanType: obj['name'] ?? obj['value'] ?? obj['code'] });
    }
    const normalized = String(raw).trim().toUpperCase();
    if (normalized === 'PROJECT' || normalized === 'PROJETO') return 'PROJECT';
    if (normalized === 'PERSONAL' || normalized === 'PESSOAL') return 'PERSONAL';
    return null;
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

  /**
   * Contrato esperado do backend (manager-custody):
   * - managerId = dono da cadeia de custódia (quem originou o empréstimo/alteração), NÃO o custodiante vigente.
   * - Cada movimentação deve expor gerenteId/custodyOwnerId estável e custodianteNome do responsável daquele período.
   * - Após transferência, o dono continua recebendo todo o histórico; o novo custodiante não deve herdar a listagem.
   */
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
    return this.http
      .post<LoanDetailResponse | null>(`${this.apiUrl}/loan/prepare`, request, this.getOptions())
      .pipe(
        map((response) => this.normalizePrepareLoanResponse(response, request)),
        tap((response) => {
          const loanId = response?.id;
          const loanType = response.loanType ?? request.loanType;
          if (loanId && loanType) {
            this.loanTypeCache.remember(loanId, loanType);
          }
        })
      );
  }

  /** POST /loan/prepare pode retornar 201 com corpo vazio ou sem id. */
  private normalizePrepareLoanResponse(
    response: LoanDetailResponse | null | undefined,
    request: LoanRequest
  ): LoanDetailResponse {
    const base =
      response && typeof response === 'object'
        ? response
        : ({
            equipmentId: request.equipmentId,
            loanType: request.loanType
          } as LoanDetailResponse);

    return this.enrichLoanWithType({
      ...base,
      loanType: base.loanType ?? request.loanType
    });
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

  registerSupportReturn(loanId: string, keepUrls: string[], photos: File[]): Observable<void> {
    const formData = new FormData();
    formData.append('keepUrls', new Blob([JSON.stringify(keepUrls)], { type: 'application/json' }));
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

  /**
   * Alteração de custódia em lote (AC4): um POST com todos os equipmentIds,
   * mesmo colaborador e mesmo período para cada item.
   */
  changeCustodyInBatch(request: CustodyChangeRequest): Observable<void> {
    const body: CustodyChangeRequest = {
      ...request,
      equipmentIds: [...new Set(
        (request.equipmentIds ?? []).map((id) => String(id).trim()).filter(Boolean)
      )]
    };
    return this.http.post<void>(`${this.apiUrl}/change-custody`, body, this.getOptions());
  }

  uploadDocuments(loanId: string, files: File[]): Observable<string[]> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return this.http.post<string[]>(`${this.apiUrl}/${loanId}/documents`, formData, this.getOptions());
  }
}
