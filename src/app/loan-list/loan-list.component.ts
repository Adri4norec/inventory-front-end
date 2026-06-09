import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, filter, map } from 'rxjs/operators';

import { LoanService } from '../services/loan/loan.service';
import { LoanRefreshService } from '../services/loan/loan-refresh.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanListResponse } from '../models/loans/loans.model';
import { EquipmentResponse, PageResponse } from '../models/equipaments/equipament.model';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, normalizeStatusType, StatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

const CATEGORIA_OPTIONS = [
  { value: 'NOTEBOOK', label: 'Notebook' },
  { value: 'MONITOR', label: 'Monitor' },
  { value: 'ACESSORIO', label: 'Acessórios' },
  { value: 'DESKTOP', label: 'Desktop' },
  { value: 'CELULAR', label: 'Celular' }
];

const STATUS_OPTIONS = [
  { value: 'EM_PREPARACAO', label: 'Em preparação' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'EM_USO', label: 'Em uso' },
  { value: 'EM_DEVOLUCAO', label: 'Em devolução' }
];

interface GroupedTask {
  equipmentId?: string;
  tombo?: string;
  loanIds: Set<string>;
}

interface EquipmentStatusResult {
  loanIds: string[];
  statusName: StatusType | null;
}

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatSnackBarModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.css']
})
export class LoanListComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['codigo', 'name', 'description', 'status', 'categoria', 'loanDate', 'returnDate', 'acoes'];
  dataSource: LoanListResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  filtros = {
    codigo: '',
    categoria: '',
    nome: '',
    caracteristicas: '',
    statuses: [] as string[]
  };
  /** Controle de empréstimo: só fluxo ativo — equipamento disponível não entra nesta lista. */
  private readonly allowedStatuses: StatusType[] = [
    StatusType.EM_PREPARACAO,
    StatusType.EM_MANUTENCAO,
    StatusType.EM_USO,
    StatusType.EM_DEVOLUCAO
  ];

  categoriaFilterOptions = CATEGORIA_OPTIONS;
  statusFilterOptions = STATUS_OPTIONS;
  private requestedStatusFilters: StatusType[] = [];
  private readonly maxBootstrapFetchSize = 200;

  private readonly subs = new Subscription();

  constructor(
    private loanService: LoanService,
    private equipamentService: EquipamentService,
    private router: Router,
    private snackBar: MatSnackBar,
    private loanRefreshService: LoanRefreshService,
    public layout: LayoutService
  ) { }

  ngOnInit(): void {
    this.carregarDados();

    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter((e) => (e.urlAfterRedirects || e.url).startsWith('/loans'))
      ).subscribe(() => this.carregarDados(this.pageIndex, this.pageSize))
    );

    this.subs.add(
      this.loanRefreshService.onRefresh$.subscribe(() => this.carregarDados(this.pageIndex, this.pageSize))
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  openAdminFinalizeReturn(item: LoanListResponse): void {
    this.router.navigate(['/loans', item.id, 'preparation-loan'], {
      queryParams: { mode: 'return-admin' }
    });
  }

  openAddReturnPhotos(item: LoanListResponse): void {
    this.router.navigate(['/loans', item.id, 'preparation-loan'], {
      queryParams: { mode: 'return-support' }
    });
  }

  openPreparationScreen(item: LoanListResponse): void {
    if (item.status === 'DISPONIVEL') {
      const equipmentId = item.equipmentId || item.id;
      this.router.navigate(['/equipaments', equipmentId, 'preparation-loan']);
      return;
    }
    this.router.navigate(['/loans', item.id, 'preparation-loan']);
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.requestedStatusFilters = this.filtros.statuses
      .map((s) => normalizeStatusType(s))
      .filter((s): s is StatusType => !!s && this.allowedStatuses.includes(s));

    this.fetchAndBuildPage(this.buildFiltrosParaApi(), page, size, 0);
  }

  private buildFiltrosParaApi(): Record<string, string | string[]> {
    const payload: Record<string, string | string[]> = {
      codigo: this.filtros.codigo,
      categoria: this.filtros.categoria,
      nome: this.filtros.nome,
      caracteristicas: this.filtros.caracteristicas
    };
    if (this.filtros.statuses.length) {
      payload['statuses'] = this.filtros.statuses;
    }
    return payload;
  }

  private fetchAndBuildPage(filtrosParaApi: any, desiredPage: number, desiredSize: number, attempt: number): void {
    const endIndex = (desiredPage + 1) * desiredSize;
    const multiplier = attempt === 0 ? 5 : attempt === 1 ? 10 : 20;
    const bootstrapSize = Math.min(this.maxBootstrapFetchSize, Math.max(desiredSize * multiplier, endIndex * 2));

    this.loanService.advancedSearch(filtrosParaApi, 0, bootstrapSize).subscribe({
      next: (response: any) => this.processarResposta(response, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private coerceApiDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private processarResposta(
    response: any,
    desiredPage: number,
    desiredSize: number,
    filtrosParaApi: any,
    attempt: number,
    bootstrapSize: number
  ): void {
    const baseList = this.sanitizeLoanData(response.content || []);

    this.pageIndex = desiredPage;

    this.syncEquipmentStatusThenFinalize(baseList, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, response);
  }

  private syncEquipmentStatusThenFinalize(
    baseList: LoanListResponse[],
    desiredPage: number,
    desiredSize: number,
    filtrosParaApi: any,
    attempt: number,
    bootstrapSize: number,
    rawResponse: any
  ): void {
    const requests = this.buildDistinctEquipmentStatusRequests(baseList);
    if (requests.length === 0) {
      const deduped = this.dedupeActiveLoanPerEquipment(baseList);
      this.finalizeDataSource(deduped, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse);
      return;
    }

    forkJoin(requests).subscribe({
      next: (results) => {
        const statusByLoanId = new Map<string, StatusType | null>();
        for (const r of results) {
          for (const loanId of r.loanIds) {
            statusByLoanId.set(loanId, r.statusName);
          }
        }

        const reconciled = baseList.map((item) => {
          const eqStatus = statusByLoanId.get(item.id);
          const normalizedEqStatus = normalizeStatusType(eqStatus);
          if (normalizedEqStatus) {
            return { ...item, status: normalizedEqStatus };
          }
          return item;
        });

        const deduped = this.dedupeActiveLoanPerEquipment(reconciled);
        this.finalizeDataSource(deduped, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse);
      },
      error: () => {
        const deduped = this.dedupeActiveLoanPerEquipment(baseList);
        this.finalizeDataSource(deduped, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse);
      }
    });
  }

  private buildDistinctEquipmentStatusRequests(
    baseList: LoanListResponse[]
  ): Observable<EquipmentStatusResult>[] {
    const groupedTasks = this.groupLoansByEquipment(baseList);
    return groupedTasks.map((task) => this.fetchStatusForTask(task));
  }

  private groupLoansByEquipment(baseList: LoanListResponse[]): GroupedTask[] {
    const byKey = new Map<string, GroupedTask>();

    for (const item of baseList) {
      const equipmentId = item.equipmentId?.trim() || null;
      const tombo = item.codigo?.trim() || null;

      if (equipmentId) {
        const key = `id:${equipmentId}`;
        if (!byKey.has(key)) byKey.set(key, { equipmentId, loanIds: new Set() });
        byKey.get(key)!.loanIds.add(item.id);
      } else if (tombo) {
        const key = `tombo:${tombo}`;
        if (!byKey.has(key)) byKey.set(key, { tombo, loanIds: new Set() });
        byKey.get(key)!.loanIds.add(item.id);
      }
    }

    return [...byKey.values()];
  }

  private fetchStatusForTask(task: GroupedTask): Observable<EquipmentStatusResult> {
    const loanIds = [...task.loanIds];

    if (task.equipmentId) {
      return this.equipamentService.findById(task.equipmentId).pipe(
        map((eq: EquipmentResponse) => ({ loanIds, statusName: eq?.statusName ?? null })),
        catchError(() => of({ loanIds, statusName: null }))
      );
    }

    return this.equipamentService.advancedSearch({ tombo: task.tombo }, 0, 1).pipe(
      map((res: PageResponse<EquipmentResponse>) => ({
        loanIds,
        statusName: res?.content?.[0]?.statusName ?? null
      })),
      catchError(() => of({ loanIds, statusName: null }))
    );
  }

  private sanitizeLoanData(content: LoanListResponse[]): LoanListResponse[] {
    return content
      .filter((item) => item.status !== 'DISPONIVEL' || !!item.hasLoanHistory)
      .map(item => ({
        ...item,
        loanDate: this.coerceApiDate(item.loanDate) as any,
        returnDate: this.coerceApiDate(item.returnDate) as any
      }));
  }

  private dedupeActiveLoanPerEquipment(list: LoanListResponse[]): LoanListResponse[] {
    const byKey = new Map<string, LoanListResponse>();

    for (const item of list) {
      const key = this.getLoanEquipmentKey(item);
      const current = byKey.get(key);
      if (!current || this.compareActiveLoanPriority(item, current) > 0) {
        byKey.set(key, item);
      }
    }

    return Array.from(byKey.values());
  }

  private getLoanEquipmentKey(item: LoanListResponse): string {
    const equipmentId = String(item.equipmentId ?? '').trim();
    if (equipmentId) return `eq:${equipmentId}`;

    const tombo = String(item.codigo ?? '').trim();
    if (tombo) return `tombo:${tombo}`;

    return `loan:${item.id}`;
  }

  private compareActiveLoanPriority(a: LoanListResponse, b: LoanListResponse): number {
    return this.activeLoanScore(a) - this.activeLoanScore(b);
  }

  private activeLoanScore(item: LoanListResponse): number {
    let score = 0;
    const status = normalizeStatusType(item.status);

    if (status === StatusType.EM_MANUTENCAO) {
      score += 50_000;
    }

    if (!item.returnDate) {
      score += 10_000;
    }

    const statusRank: Partial<Record<StatusType, number>> = {
      [StatusType.EM_DEVOLUCAO]: 400,
      [StatusType.EM_USO]: 300,
      [StatusType.EM_PREPARACAO]: 200
    };
    score += statusRank[status as StatusType] ?? 0;

    const loanTime = this.coerceApiDate(item.loanDate)?.getTime() ?? 0;
    score += loanTime / 1e12;

    return score;
  }

  private finalizeDataSource(
    list: LoanListResponse[],
    desiredPage: number,
    desiredSize: number,
    filtrosParaApi: any,
    attempt: number,
    bootstrapSize: number,
    rawResponse: any
  ): void {
    const onlyAllowed = list.filter((it) => {
      const st = normalizeStatusType(it.status);
      return !!st && this.allowedStatuses.includes(st);
    });

    const filtered = this.applyRequestedStatusFilter(onlyAllowed);
    this.totalElements = filtered.length;

    const start = desiredPage * desiredSize;
    const end = start + desiredSize;
    const pageSlice = filtered.slice(start, end);

    const canRetry = attempt < 2;
    const backendMayHaveMore = Array.isArray(rawResponse?.content) && rawResponse.content.length >= bootstrapSize;
    if (pageSlice.length < desiredSize && canRetry && backendMayHaveMore) {
      this.fetchAndBuildPage(filtrosParaApi, desiredPage, desiredSize, attempt + 1);
      return;
    }

    this.dataSource = pageSlice;
    this.isLoading = false;
  }

  private applyRequestedStatusFilter(list: LoanListResponse[]): LoanListResponse[] {
    if (!this.requestedStatusFilters.length) return list;
    return list.filter((it) => {
      const st = normalizeStatusType(it.status);
      return !!st && this.requestedStatusFilters.includes(st);
    });
  }

  getStatusSelectLabel(): string {
    if (!this.filtros.statuses.length) {
      return '';
    }
    return this.filtros.statuses
      .map((value) => this.statusFilterOptions.find((opt) => opt.value === value)?.label ?? value)
      .join(', ');
  }

  isExtinto(status: unknown): boolean {
    const st = normalizeStatusType(status);
    return !st || !this.allowedStatuses.includes(st);
  }

  isEmManutencao(status: unknown): boolean {
    return normalizeStatusType(status) === StatusType.EM_MANUTENCAO;
  }

  acoesBloqueadas(status: unknown): boolean {
    return this.isExtinto(status) || this.isEmManutencao(status);
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.snackBar.open(mensagem, 'Fechar', { duration: 5000 });
    this.isLoading = false;
  }

  formatStatus(status: string): string {
    return formatStatusLabel(status);
  }

  getStatusClass(status: string): string {
    return statusColorClass(status);
  }

  podeIniciarDevolucao(status: string): boolean {
    return normalizeStatusType(status) === StatusType.EM_USO;
  }

  podeFinalizarDevolucao(status: string): boolean {
    return status === 'EM_DEVOLUCAO';
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  limparFiltros(): void {
    this.filtros = {
      codigo: '',
      categoria: '',
      nome: '',
      caracteristicas: '',
      statuses: []
    };
    this.aplicarFiltros();
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }
}