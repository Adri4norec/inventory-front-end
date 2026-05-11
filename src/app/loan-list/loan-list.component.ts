import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LoanService } from '../services/loan/loan.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanListResponse } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, normalizeStatusType, STATUS_TYPE_OPTIONS, StatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

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
export class LoanListComponent implements OnInit {

  displayedColumns: string[] = ['codigo', 'categoria', 'name', 'description', 'status', 'loanDate', 'returnDate', 'acoes'];
  dataSource: LoanListResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  filtros = { codigo: '', categoria: '', nome: '', caracteristicas: '', status: '' };
  /** Controle de empréstimo: só fluxo ativo — equipamento disponível não entra nesta lista. */
  private readonly allowedStatuses: StatusType[] = [
    StatusType.EM_PREPARACAO,
    StatusType.EM_MANUTENCAO,
    StatusType.EM_USO,
    StatusType.EM_DEVOLUCAO
  ];

  statusFilterOptions = STATUS_TYPE_OPTIONS.filter((o) => this.allowedStatuses.includes(o.value));
  private requestedStatusFilter: StatusType | null = null;
  private readonly maxBootstrapFetchSize = 200;

  constructor(
    private loanService: LoanService,
    private equipamentService: EquipamentService,
    private router: Router,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) { }

  ngOnInit(): void {
    this.carregarDados();
  }

  openSupportReturn(item: LoanListResponse): void {
    this.router.navigate(['/loans', item.id, 'preparation-loan'], {
      queryParams: { mode: 'return-support' }
    });
  }

  openAdminFinalizeReturn(item: LoanListResponse): void {
    this.router.navigate(['/loans', item.id, 'preparation-loan'], {
      queryParams: { mode: 'return-admin' }
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
    this.requestedStatusFilter = normalizeStatusType(this.filtros.status);

    const filtrosParaApi = { ...this.filtros };
    filtrosParaApi.status = '';

    this.fetchAndBuildPage(filtrosParaApi, page, size, 0);
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

  /**
   * Alinha o status da linha com o cadastro de equipamentos (movimentações, manutenção, etc.).
   * Uma requisição por equipamento distinto (deduplica por equipmentId ou tombo), não N por linha.
   */
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
      this.finalizeDataSource(baseList, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse);
      return;
    }

    forkJoin(requests).subscribe({
      next: (results) => {
        const statusByLoanId = new Map<string, unknown>();
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

        this.finalizeDataSource(reconciled, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse);
      },
      error: () =>
        this.finalizeDataSource(baseList, desiredPage, desiredSize, filtrosParaApi, attempt, bootstrapSize, rawResponse)
    });
  }

  private buildDistinctEquipmentStatusRequests(
    baseList: LoanListResponse[]
  ): Observable<{ loanIds: string[]; statusName: unknown }>[] {
    const byKey = new Map<string, { equipmentId?: string; tombo?: string; loanIds: Set<string> }>();

    for (const item of baseList) {
      const loanId = item.id;
      const equipmentId = (item.equipmentId ?? '').trim() || null;
      const tombo = (item.codigo ?? '').trim() || null;

      if (equipmentId) {
        const key = `id:${equipmentId}`;
        if (!byKey.has(key)) {
          byKey.set(key, { equipmentId, loanIds: new Set() });
        }
        byKey.get(key)!.loanIds.add(loanId);
      } else if (tombo) {
        const key = `tombo:${tombo}`;
        if (!byKey.has(key)) {
          byKey.set(key, { tombo, loanIds: new Set() });
        }
        byKey.get(key)!.loanIds.add(loanId);
      }
    }

    return [...byKey.values()].map((task) => {
      const loanIds = [...task.loanIds];
      if (task.equipmentId) {
        return this.equipamentService.findById(task.equipmentId).pipe(
          map((eq: { statusName?: unknown }) => ({ loanIds, statusName: eq?.statusName ?? null })),
          catchError(() => of({ loanIds, statusName: null }))
        );
      }
      return this.equipamentService.advancedSearch({ tombo: task.tombo }, 0, 1).pipe(
        map((res: { content?: { statusName?: unknown }[] }) => ({
          loanIds,
          statusName: res?.content?.[0]?.statusName ?? null
        })),
        catchError(() => of({ loanIds, statusName: null }))
      );
    });
  }

  /** Remove linhas que são só cadastro disponível sem empréstimo (ruído do advanced-search). */
  private sanitizeLoanData(content: LoanListResponse[]): LoanListResponse[] {
    return content
      .filter((item) => item.status !== 'DISPONIVEL' || !!item.hasLoanHistory)
      .map(item => ({
        ...item,
        loanDate: this.coerceApiDate(item.loanDate) as any,
        returnDate: this.coerceApiDate(item.returnDate) as any
      }));
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
    if (!this.requestedStatusFilter) return list;
    return list.filter(it => normalizeStatusType(it.status) === this.requestedStatusFilter);
  }

  isExtinto(status: unknown): boolean {
    const st = normalizeStatusType(status);
    return !st || !this.allowedStatuses.includes(st);
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

  podeDevolver(status: string): boolean {
    return status === 'EMPRESTIMO_FINALIZADO';
  }

  podeFinalizarDevolucao(status: string): boolean {
    return status === 'EM_DEVOLUCAO';
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  limparFiltros(): void {
    this.filtros = { codigo: '', categoria: '', nome: '', caracteristicas: '', status: '' };
    this.aplicarFiltros();
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }
}