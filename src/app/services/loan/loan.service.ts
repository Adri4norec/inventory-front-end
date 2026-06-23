import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
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
import { appendAll } from '../../core/http/http-params.util';
import { LoanTypeCacheService } from './loan-type-cache.service';

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
    if (!eqId) {
      return of(null);
    }

    return this.getActiveLoanByEquipment(eqId);
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
      nome: 'nome',
      caracteristicas: 'caracteristicas'
    };

    Object.keys(mapeamento).forEach((key) => {
      const value = filtros[key];
      if (typeof value === 'string' && value) {
        params = params.set(mapeamento[key], value);
      }
    });

    const selectedCategories = (filtros['categorias'] as string[] | undefined)
      ?? (typeof filtros['categoria'] === 'string' && filtros['categoria']
        ? [filtros['categoria']]
        : []);
    params = appendAll(params, 'categoria', selectedCategories);

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
   * - managerId = UUID do gerente/originador (opcional quando custodianteId é informado).
   * - custodianteId = UUID do responsável designado no empréstimo projeto.
   * - nome = filtro textual do custodiante.
   * - O frontend também complementa com empréstimos PROJECT ativos (colaboradorId).
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
    managerId: string | null | undefined,
    filtros: ManagerCustodySearchFilters,
    page: number,
    size: number
  ): Observable<PageResponse<CustodiaResponse>> {
    const options = this.getOptions();
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const manager = managerId?.trim();
    if (manager) {
      params = params.set('managerId', manager);
    }

    const equipmentId = filtros.equipmentId?.trim();
    const nome = filtros.nome?.trim();
    const custodianteId = filtros.custodianteId?.trim();
    if (equipmentId) params = params.set('equipmentId', equipmentId);
    if (nome) params = params.set('nome', nome);
    if (custodianteId) params = params.set('custodianteId', custodianteId);
    if (filtros.dataInicio) params = params.set('dataInicio', filtros.dataInicio);
    if (filtros.dataFim) params = params.set('dataFim', filtros.dataFim);
    if (filtros.loanType) params = params.set('loanType', filtros.loanType);

    return this.http.get<PageResponse<CustodiaResponse>>(
      `${this.apiUrl}/manager-custody/advanced-search`,
      { ...options, params }
    );
  }

  /**
   * Todos os empréstimos PROJECT ativos — usado para montar índice do visualizador original
   * (colaboradorId no empréstimo) e complementar a listagem de custódia.
   */
  fetchAllActiveProjectLoanCustody(): Observable<{
    items: CustodiaResponse[];
    viewerByEquipment: Map<string, { userId: string | null; names: Set<string> }>;
  }> {
    return this.getLoansList().pipe(
      switchMap((list) => {
        const activeEntries = (list ?? [])
          .filter((item) => this.isActiveLoanListItem(item))
          .map((item) => ({
            id: String(item?.id ?? '').trim(),
            codigo: item?.codigo
          }))
          .filter((entry) => !!entry.id);

        if (!activeEntries.length) {
          return of({
            items: [] as CustodiaResponse[],
            viewerByEquipment: new Map<string, { userId: string | null; names: Set<string> }>()
          });
        }

        return forkJoin(
          activeEntries.map((entry) =>
            this.getLoanById(entry.id).pipe(
              map((loan) => ({ loan, codigo: entry.codigo })),
              catchError(() => of(null as { loan: LoanDetailResponse; codigo?: string } | null))
            )
          )
        ).pipe(
          map((details) => {
            const items: CustodiaResponse[] = [];
            const viewerByEquipment = new Map<string, { userId: string | null; names: Set<string> }>();

            for (const entry of details ?? []) {
              if (!entry?.loan) continue;

              const enriched = this.enrichLoanWithType(entry.loan);
              if (this.parseLoanType(enriched) !== 'PROJECT') continue;

              const viewerId = this.readLoanColaboradorId(enriched) || null;
              const viewerName = this.normalizeViewerName(
                this.readLoanColaboradorName(enriched, null)
              );
              const names = new Set<string>();
              if (viewerName) names.add(viewerName);

              const custody = this.mapLoanToCustodiaResponse(
                enriched,
                viewerId ?? '',
                this.readLoanColaboradorName(enriched, null),
                entry.codigo
              );
              items.push(custody);

              const equipmentKey = String(custody.equipmentId ?? '').trim();
              if (equipmentKey) {
                viewerByEquipment.set(equipmentKey, { userId: viewerId, names });
              }
            }

            return { items, viewerByEquipment };
          })
        );
      }),
      catchError(() =>
        of({
          items: [] as CustodiaResponse[],
          viewerByEquipment: new Map<string, { userId: string | null; names: Set<string> }>()
        })
      )
    );
  }

  private normalizeViewerName(value?: string | null): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Fallback quando manager-custody não devolve itens para o custodiante:
   * monta custódia a partir de empréstimos PROJECT ativos em que colaboradorId = usuário logado.
   */
  fetchProjectCustodyAsCustodian(
    custodianUserId: string,
    custodianName?: string | null,
    equipmentKey?: string
  ): Observable<CustodiaResponse[]> {
    const userId = custodianUserId.trim();
    if (!userId) return of([]);

    return this.getLoansList().pipe(
      switchMap((list) => {
        const activeIds = (list ?? [])
          .filter((item) => this.isActiveLoanListItem(item))
          .map((item) => String(item?.id ?? '').trim())
          .filter(Boolean);

        if (!activeIds.length) return of([] as CustodiaResponse[]);

        return forkJoin(
          activeIds.map((id) =>
            this.getLoanById(id).pipe(
              map((loan) => {
                const listItem = (list ?? []).find((entry) => String(entry?.id ?? '').trim() === id);
                return { loan, codigo: listItem?.codigo };
              }),
              catchError(() => of(null as { loan: LoanDetailResponse; codigo?: string } | null))
            )
          )
        ).pipe(
          map((details) =>
            (details ?? [])
              .filter(
                (entry): entry is { loan: LoanDetailResponse; codigo?: string } =>
                  !!entry?.loan && this.isProjectLoanForCustodian(entry.loan, userId, custodianName)
              )
              .map(({ loan, codigo }) =>
                this.mapLoanToCustodiaResponse(loan, userId, custodianName, codigo)
              )
              .filter((item) => this.matchesEquipmentKey(item, equipmentKey))
          )
        );
      }),
      catchError(() => of([]))
    );
  }

  private isActiveLoanListItem(item: LoanListResponse): boolean {
    const status = String(item?.status ?? '').trim().toUpperCase();
    return status === StatusType.EM_USO
      || status === StatusType.EM_PREPARACAO
      || status === 'PREPARACAO'
      || status === StatusType.EM_DEVOLUCAO;
  }

  private isProjectLoanForCustodian(
    loan: LoanDetailResponse,
    custodianUserId: string,
    custodianName?: string | null
  ): boolean {
    const enriched = this.enrichLoanWithType(loan);
    const loanType = this.parseLoanType(enriched);
    if (loanType !== 'PROJECT') return false;

    const colaboradorId = this.readLoanColaboradorId(enriched);
    if (colaboradorId && colaboradorId === custodianUserId) return true;

    if (custodianName) {
      const loanName = this.normalizeViewerName(this.readLoanColaboradorName(enriched, custodianName));
      const targetName = this.normalizeViewerName(custodianName);
      if (loanName && targetName && loanName === targetName) return true;
    }

    return false;
  }

  private readLoanColaboradorId(loan: LoanDetailResponse): string {
    const direct = String(loan.colaboradorId ?? '').trim();
    if (direct) return direct;

    const responsavel = loan.responsavel;
    if (responsavel && typeof responsavel === 'object') {
      return String(responsavel.id ?? '').trim();
    }

    return '';
  }

  private readLoanColaboradorName(loan: LoanDetailResponse, fallback?: string | null): string {
    const responsavel = loan.responsavel;
    if (responsavel && typeof responsavel === 'object') {
      const name = String(responsavel.fullName ?? '').trim();
      if (name) return name;
    }
    if (typeof responsavel === 'string' && responsavel.trim()) {
      return responsavel.trim();
    }
    const fullName = String(loan.fullName ?? '').trim();
    if (fullName) return fullName;
    return String(fallback ?? '').trim();
  }

  private mapLoanToCustodiaResponse(
    loan: LoanDetailResponse,
    custodianUserId: string,
    custodianName?: string | null,
    listCodigo?: string
  ): CustodiaResponse {
    const record = loan as LoanDetailResponse & { codigo?: string; topo?: string | number };
    const equipmentId = String(
      listCodigo ?? record.codigo ?? record.equipmentId ?? record.topo ?? ''
    ).trim();

    return {
      id: String(loan.id),
      equipmentId,
      custodianteNome: this.readLoanColaboradorName(loan, custodianName),
      custodianteId: custodianUserId,
      inicioPeriodo: loan.loanDate ?? new Date().toISOString(),
      fimPeriodo: loan.expectedReturnDate ?? loan.returnDate ?? null,
      loanType: 'PROJECT'
    };
  }

  private matchesEquipmentKey(item: CustodiaResponse, equipmentKey?: string): boolean {
    const key = String(equipmentKey ?? '').trim();
    if (!key) return true;
    return String(item.equipmentId ?? '').trim() === key;
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
