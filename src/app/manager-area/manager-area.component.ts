import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';

import { LayoutService } from '../services/layout/layout.service';
import { AuthService } from '../services/auth/auth.service';
import { LoanService } from '../services/loan/loan.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { StatusType, normalizeStatusType } from '../models/status/status-type';
import {
  CustodiaResponse,
  CustodyChangeRequest,
  LoanType,
  ManagerCustodySearchFilters
} from '../models/loans/loans.model';
import { UserService } from '../services/user/user.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import {
  ChangeCustodyDialogComponent,
  ChangeCustodyDialogData
} from './change-custody-dialog.component';
import {
  diagnoseCustodyScope,
  filterMovementsForLoggedCustodyOwner,
  normalizePersonName
} from '../core/custody-owner.util';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-manager-area',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatMenuModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatPaginatorModule,
    MatDialogModule,
    MatSnackBarModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './manager-area.component.html',
  styleUrls: ['./manager-area.component.css']
})
export class ManagerAreaComponent implements OnInit, OnDestroy {

  displayedColumns: string[] = ['equipmentId', 'custodianteNome', 'inicioPeriodo', 'fimPeriodo', 'acoes'];
  private allCustodyMovements: CustodiaResponse[] = [];
  /** Lista completa após filtros (inclui exclusão de devolvidos), antes da paginação. */
  private visibleCustodyItems: CustodiaResponse[] = [];
  dataSource: CustodiaResponse[] = [];
  filtros = {
    equipmentId: '',
    nome: '',
    dataInicio: null as Date | null,
    dataFim: null as Date | null
  };
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  private static readonly CUSTODY_CLIENT_FETCH_SIZE = 5000;

  /** Datas informadas no popup enquanto a API não devolve fimPeriodo correto. */
  private readonly pendingCustodyByEquipment = new Map<
    string,
    { inicioPeriodo: string; fimPeriodo: string | null }
  >();

  private readonly subs = new Subscription();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  private resolvingManagerId = false;
  /** false quando o backend ainda não expõe manager-custody/advanced-search */
  private advancedSearchAvailable = true;

  constructor(
    private router: Router,
    public layout: LayoutService,
    private authService: AuthService,
    private loanService: LoanService,
    private equipamentService: EquipamentService,
    private userService: UserService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  /** Custodiante = responsável selecionado no empréstimo ou na alteração de custódia. */
  getCustodianteLabel(element: CustodiaResponse): string {
    const nome = String(element?.custodianteNome ?? '').trim();
    return nome || '-';
  }

  private getMovementsForEquipment(equipmentId: string): CustodiaResponse[] {
    const key = String(equipmentId ?? '').trim();
    if (!key) return [];
    return this.allCustodyMovements.filter(
      (item) => String(item?.equipmentId ?? '').trim() === key
    );
  }

  private getLoggedPersonNames(): Set<string> {
    const names = new Set<string>();
    const fullName = normalizePersonName(this.authService.getFullName());
    const username = normalizePersonName(localStorage.getItem('user'));
    if (fullName) names.add(fullName);
    if (username) names.add(username);
    return names;
  }

  ngOnInit(): void {
    this.carregarItensCustodia();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  carregarItensCustodia(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.pageIndex = page;
    this.pageSize = size;

    const managerId = this.getLoggedManagerId();
    if (!managerId) {
      this.resolveManagerIdFromApiAndReload(page, size);
      return;
    }

    const filtersOnServer = this.advancedSearchAvailable;
    const request$ = filtersOnServer
      ? this.loanService.managerCustodyAdvancedSearch(
          managerId,
          this.buildCustodyApiFilters(),
          0,
          ManagerAreaComponent.CUSTODY_CLIENT_FETCH_SIZE
        )
      : this.loanService.getManagerCustody(
          managerId,
          0,
          ManagerAreaComponent.CUSTODY_CLIENT_FETCH_SIZE
        );

    this.subs.add(
      request$
        .pipe(
          switchMap((response) => {
            const content = (response?.content ?? []) as CustodiaResponse[];
            const items = this.buildCustodyListItems(content, filtersOnServer);
            return this.excludeReturnedAvailableEquipment(items);
          }),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: (items) => this.publishCustodyPage(items, page, size),
          error: (err) => {
            if (filtersOnServer && this.loanService.isManagerCustodyAdvancedSearchUnavailable(err)) {
              this.advancedSearchAvailable = false;
              this.carregarItensCustodia(page, size);
              return;
            }
            this.lidarComErro('Erro ao carregar itens sob custódia', err);
          }
        })
    );
  }

  private buildCustodyListItems(
    content: CustodiaResponse[],
    filtersOnServer: boolean
  ): CustodiaResponse[] {
    this.allCustodyMovements = content.map((item) => ({ ...item }));

    if (!environment.production) {
      const loggedId = this.getLoggedManagerId();
      const loggedNames = this.getLoggedPersonNames();
      console.group('[Custódia] Diagnóstico de escopo');
      console.log('Usuário logado:', this.authService.getFullName() || localStorage.getItem('user'), loggedId);
      console.log('Registros brutos da API:', content.length);
      console.table(
        diagnoseCustodyScope(content, loggedId, loggedNames).map((row) => ({
          equipamento: row.equipmentId,
          movimentacoes: row.movementCount,
          donoResolvido: row.resolvedOwner,
          custodianteVigente: row.currentCustodian,
          exibirParaLogado: row.visibleToLoggedUser,
          gerenteIdApi: row.stableOwnerIds.join(', ') || '(ausente)'
        }))
      );
      if (!content.length) {
        console.warn(
          '[Custódia] API retornou lista vazia. Se o equipamento sumiu após transferência, ' +
            'o backend provavelmente filtra pelo custodiante vigente em vez do dono da cadeia.'
        );
      }
      console.groupEnd();
    }

    this.allCustodyMovements = this.filterProjectLoanMovements(this.allCustodyMovements);
    this.allCustodyMovements = filterMovementsForLoggedCustodyOwner(
      this.allCustodyMovements,
      this.getLoggedManagerId(),
      this.getLoggedPersonNames()
    );

    let items = this.dedupeLatestPerEquipment(this.allCustodyMovements);
    items = this.applyPendingCustodyOverrides(items);
    if (!filtersOnServer) {
      items = this.applyClientFilters(items);
    }
    return this.sortCustodiaList(items);
  }

  private publishCustodyPage(items: CustodiaResponse[], page: number, size: number): void {
    this.visibleCustodyItems = items;
    this.totalElements = items.length;
    const start = page * size;
    this.dataSource = items.slice(start, start + size);
    this.pageIndex = page;
    this.pageSize = size;
  }

  /**
   * Equipamento devolvido (DISPONIVEL) não permanece sob custódia do gerente nesta listagem.
   * Custódia vencida com equipamento ainda EM_USO continua visível (destaque laranja).
   */
  private excludeReturnedAvailableEquipment(items: CustodiaResponse[]): Observable<CustodiaResponse[]> {
    const equipmentIds = [
      ...new Set(
        items
          .map((item) => String(item?.equipmentId ?? '').trim())
          .filter((id) => !!id)
      )
    ];

    if (!equipmentIds.length) {
      return of(items);
    }

    return forkJoin(
      equipmentIds.map((equipmentKey) => this.fetchEquipmentStatusForCustodyKey(equipmentKey))
    ).pipe(
      map((rows) => {
        const availableIds = new Set(
          rows
            .filter((row) => row.status === StatusType.DISPONIVEL)
            .map((row) => row.equipmentId)
        );
        return items.filter((item) => !availableIds.has(String(item?.equipmentId ?? '').trim()));
      }),
      catchError(() => of(items))
    );
  }

  private readEquipmentStatus(equipment: unknown): StatusType | null {
    if (!equipment || typeof equipment !== 'object') return null;
    const record = equipment as Record<string, unknown>;
    return normalizeStatusType(record['statusName'] ?? record['status'] ?? record['statusEquipamento']);
  }

  /**
   * Custódia pode trazer equipmentId como UUID ou como tombo/código (ex.: "1112").
   * findById só aceita UUID — tombo usa advanced-search para não gerar BUSINESS_ERROR no interceptor.
   */
  private fetchEquipmentStatusForCustodyKey(
    equipmentKey: string
  ): Observable<{ equipmentId: string; status: StatusType | null }> {
    const lookup$ = this.isUuid(equipmentKey)
      ? this.equipamentService.findById(equipmentKey)
      : this.equipamentService.advancedSearch({ tombo: equipmentKey }, 0, 1).pipe(
          map((response: { content?: unknown[] }) => response?.content?.[0] ?? null)
        );

    return lookup$.pipe(
      map((equipment) => ({
        equipmentId: equipmentKey,
        status: this.readEquipmentStatus(equipment)
      })),
      catchError(() => of({ equipmentId: equipmentKey, status: null as StatusType | null }))
    );
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarItensCustodia(0, this.pageSize);
  }

  limparFiltros(): void {
    this.filtros = {
      equipmentId: '',
      nome: '',
      dataInicio: null,
      dataFim: null
    };
    this.aplicarFiltros();
  }

  handlePageEvent(e: PageEvent): void {
    this.carregarItensCustodia(e.pageIndex, e.pageSize);
  }

  isVencido(fimPeriodo: string | null | undefined): boolean {
    if (!fimPeriodo) return false;
    const dataFim = new Date(fimPeriodo);
    if (isNaN(dataFim.getTime())) return false;
    return dataFim.getTime() < Date.now();
  }

  verDetalhes(element: CustodiaResponse): void {
    const equipmentKey = String(element?.equipmentId ?? '').trim();
    const history = this.getMovementsForEquipment(equipmentKey);

    this.router.navigate(['/equipaments', element.equipmentId, 'detalhes'], {
      state: { custodyHistory: history }
    });
  }

  alterarCustodiaGeral(): void {
    const ids = this.getEquipmentIdsForGeneralDialog();
    if (ids.length === 0) {
      this.lidarComErro('Nenhum item disponível para alteração de custódia.', null);
      return;
    }

    this.openChangeCustodyDialog({
      mode: 'general',
      availableEquipmentIds: ids
    });
  }

  private getEquipmentIdsForGeneralDialog(): string[] {
    if (this.visibleCustodyItems.length) {
      return this.extractEquipmentIdsFromContent(this.visibleCustodyItems);
    }
    return this.extractEquipmentIdsFromContent(this.dataSource);
  }

  alterarCustodia(element: CustodiaResponse): void {
    this.openChangeCustodyDialog({
      mode: 'row',
      loanId: element.id,
      equipmentId: element.equipmentId,
      custodianteNome: this.getCustodianteLabel(element),
      availableEquipmentIds: []
    });
  }

  private buildApiFilters(): ManagerCustodySearchFilters {
    const filters: ManagerCustodySearchFilters = {};
    const equipmentId = this.filtros.equipmentId?.trim();
    const nome = this.filtros.nome?.trim();

    if (equipmentId) filters.equipmentId = equipmentId;
    if (nome) filters.nome = nome;

    const dataInicio = this.formatDateParam(this.filtros.dataInicio);
    const dataFim = this.formatDateParam(this.filtros.dataFim);
    if (dataInicio) filters.dataInicio = dataInicio;
    if (dataFim) filters.dataFim = dataFim;

    return filters;
  }

  /** Filtros da custódia: apenas empréstimos do tipo Projeto entram na listagem. */
  private buildCustodyApiFilters(): ManagerCustodySearchFilters {
    return {
      ...this.buildApiFilters(),
      loanType: 'PROJECT'
    };
  }

  /**
   * Área do Gerente: empréstimo Pessoal não entra na custódia.
   * Movimentações sem loanType (ex.: alteração de custódia) permanecem se o equipamento
   * ainda tiver ao menos um registro de empréstimo Projeto no histórico.
   */
  private filterProjectLoanMovements(movements: CustodiaResponse[]): CustodiaResponse[] {
    const byEquipment = new Map<string, CustodiaResponse[]>();

    for (const item of movements) {
      const key = String(item?.equipmentId ?? '').trim();
      if (!key) continue;
      const group = byEquipment.get(key) ?? [];
      group.push(item);
      byEquipment.set(key, group);
    }

    const allowedKeys = new Set<string>();
    byEquipment.forEach((group, key) => {
      if (this.isEquipmentEligibleForCustodyList(group)) {
        allowedKeys.add(key);
      }
    });

    return movements.filter((item) => {
      const key = String(item?.equipmentId ?? '').trim();
      return key && allowedKeys.has(key);
    });
  }

  private isEquipmentEligibleForCustodyList(group: CustodiaResponse[]): boolean {
    const hasProject = group.some((item) => this.readLoanType(item) === 'PROJECT');
    if (hasProject) return true;

    const hasPersonal = group.some((item) => this.readLoanType(item) === 'PERSONAL');
    if (hasPersonal) return false;

    return true;
  }

  private readLoanType(item: CustodiaResponse): LoanType | null {
    const record = item as CustodiaResponse & { tipoEmprestimo?: string };
    const raw = record.loanType ?? record.tipoEmprestimo;
    if (!raw) return null;

    const normalized = String(raw).trim().toUpperCase();
    if (normalized === 'PROJECT' || normalized === 'PROJETO') return 'PROJECT';
    if (normalized === 'PERSONAL' || normalized === 'PESSOAL') return 'PERSONAL';
    return null;
  }

  private formatDateParam(date: Date | null): string | undefined {
    if (!date || isNaN(date.getTime())) return undefined;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private applyClientFilters(items: CustodiaResponse[]): CustodiaResponse[] {
    const equipmentId = this.filtros.equipmentId?.trim().toLowerCase();
    const nome = this.filtros.nome?.trim().toLowerCase();
    const dataInicio = this.filtros.dataInicio;
    const dataFim = this.filtros.dataFim;

    if (!equipmentId && !nome && !dataInicio && !dataFim) {
      return items;
    }

    return items.filter((item) => {
      if (equipmentId) {
        const id = String(item?.equipmentId ?? '').toLowerCase();
        if (!id.includes(equipmentId)) return false;
      }

      if (nome) {
        const custodiante = String(item?.custodianteNome ?? '').toLowerCase();
        const label = this.getCustodianteLabel(item).toLowerCase();
        if (!custodiante.includes(nome) && !label.includes(nome)) return false;
      }

      if (dataInicio || dataFim) {
        const inicio = new Date(item?.inicioPeriodo ?? '');
        if (isNaN(inicio.getTime())) return false;

        if (dataInicio) {
          const min = new Date(dataInicio);
          min.setHours(0, 0, 0, 0);
          if (inicio < min) return false;
        }

        if (dataFim) {
          const max = new Date(dataFim);
          max.setHours(23, 59, 59, 999);
          if (inicio > max) return false;
        }
      }

      return true;
    });
  }

  private dedupeLatestPerEquipment(items: CustodiaResponse[]): CustodiaResponse[] {
    const byEquipment = new Map<string, CustodiaResponse[]>();

    for (const item of items) {
      const key = String(item?.equipmentId ?? '').trim();
      if (!key) continue;

      const group = byEquipment.get(key) ?? [];
      group.push(item);
      byEquipment.set(key, group);
    }

    return Array.from(byEquipment.values()).map((group) => {
      const current = this.pickCurrentCustodyForList(group);
      return { ...current };
    });
  }

  /** Custódia vigente: fim futuro vence encerrada; depois em aberto; por fim o início mais recente. */
  private pickCurrentCustodyForList(movements: CustodiaResponse[]): CustodiaResponse {
    const withFutureEnd = movements.filter((item) => this.hasFutureEnd(item));
    if (withFutureEnd.length > 0) {
      return { ...withFutureEnd.sort((a, b) => this.compareCustodyRecency(b, a))[0] };
    }

    const openEnded = movements.filter((item) => !item?.fimPeriodo);
    if (openEnded.length > 0) {
      return { ...openEnded.sort((a, b) => this.compareCustodyRecency(b, a))[0] };
    }

    return { ...movements.sort((a, b) => this.compareCustodyRecency(b, a))[0] };
  }

  private hasFutureEnd(item: CustodiaResponse): boolean {
    if (!item?.fimPeriodo) return false;
    const fim = this.parseCustodyDate(item.fimPeriodo)?.getTime();
    return fim != null && fim >= Date.now();
  }

  private isActiveCustody(item: CustodiaResponse): boolean {
    if (!item?.fimPeriodo) return true;
    return this.hasFutureEnd(item);
  }

  private parseCustodyDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  private compareCustodyRecency(a: CustodiaResponse, b: CustodiaResponse): number {
    const aTime = this.parseCustodyDate(a?.inicioPeriodo)?.getTime();
    const bTime = this.parseCustodyDate(b?.inicioPeriodo)?.getTime();

    if (aTime != null && bTime != null && aTime !== bTime) {
      return aTime - bTime;
    }
    if (aTime != null && bTime == null) return 1;
    if (aTime == null && bTime != null) return -1;

    const aEndScore = this.custodyEndScore(a?.fimPeriodo);
    const bEndScore = this.custodyEndScore(b?.fimPeriodo);
    if (aEndScore !== bEndScore) {
      return aEndScore - bEndScore;
    }

    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  }

  /** Maior score = custódia vigente mais recente (fim futuro/em aberto vence encerramento passado). */
  private custodyEndScore(fimPeriodo?: string | null): number {
    if (!fimPeriodo) return Number.POSITIVE_INFINITY;
    return this.parseCustodyDate(fimPeriodo)?.getTime() ?? 0;
  }

  private applyPendingCustodyOverrides(items: CustodiaResponse[]): CustodiaResponse[] {
    return items.map((item) => {
      const key = String(item?.equipmentId ?? '').trim();
      const pending = key ? this.pendingCustodyByEquipment.get(key) : undefined;
      if (!pending) return item;

      return {
        ...item,
        inicioPeriodo: pending.inicioPeriodo,
        fimPeriodo: pending.fimPeriodo
      };
    });
  }

  private rememberPendingCustodyChange(payload: CustodyChangeRequest): void {
    (payload.equipmentIds ?? []).forEach((id) => {
      const key = String(id ?? '').trim();
      if (!key) return;

      this.pendingCustodyByEquipment.set(key, {
        inicioPeriodo: payload.inicioPeriodo,
        fimPeriodo: payload.fimPeriodo ?? null
      });
    });
  }

  /** Ordem da tabela: custódia/empréstimo iniciado mais recentemente no topo. */
  private sortCustodiaList(items: CustodiaResponse[]): CustodiaResponse[] {
    return [...items].sort((a, b) => {
      const aInicio = this.parseCustodyDate(a?.inicioPeriodo)?.getTime() ?? 0;
      const bInicio = this.parseCustodyDate(b?.inicioPeriodo)?.getTime() ?? 0;
      if (aInicio !== bInicio) return bInicio - aInicio;
      return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
    });
  }

  private getAvailableEquipmentIdsFromPage(): string[] {
    return this.extractEquipmentIdsFromContent(this.dataSource);
  }

  private extractEquipmentIdsFromContent(items: CustodiaResponse[]): string[] {
    const ids = new Set<string>();
    items.forEach((item) => {
      const id = String(item?.equipmentId ?? '').trim();
      if (id) ids.add(id);
    });
    return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  private openChangeCustodyDialog(data: ChangeCustodyDialogData): void {
    const ref = this.dialog.open(ChangeCustodyDialogComponent, {
      width: '640px',
      maxWidth: '92vw',
      maxHeight: '90vh',
      autoFocus: false,
      panelClass: 'change-custody-dialog-panel',
      data
    });

    this.subs.add(
      ref.afterClosed().subscribe((payload?: CustodyChangeRequest) => {
        if (!payload) return;
        this.applyBatchCustodyChange(payload);
      })
    );
  }

  /**
   * AC4 — processamento em massa: uma única chamada POST /change-custody com todos os IDs
   * selecionados no diálogo geral (mesmo colaborador e período). Modo linha envia um ID no mesmo fluxo.
   */
  private applyBatchCustodyChange(payload: CustodyChangeRequest): void {
    const equipmentIds = [
      ...new Set((payload.equipmentIds ?? []).map((id) => String(id).trim()).filter(Boolean))
    ];

    if (!equipmentIds.length) {
      this.lidarComErro('Nenhum equipamento selecionado para alteração de custódia.', null);
      return;
    }

    const batchRequest: CustodyChangeRequest = {
      collaboratorId: payload.collaboratorId,
      inicioPeriodo: payload.inicioPeriodo,
      fimPeriodo: payload.fimPeriodo ?? null,
      equipmentIds
    };

    this.isLoading = true;
    this.subs.add(
      this.loanService
        .changeCustodyInBatch(batchRequest)
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: () => {
            this.rememberPendingCustodyChange({ ...batchRequest, equipmentIds });
            const msg =
              equipmentIds.length > 1
                ? `Custódia alterada com sucesso para ${equipmentIds.length} equipamentos.`
                : 'Custódia alterada com sucesso!';
            this.snackBar.open(msg, 'Fechar', { duration: 5000 });
            this.carregarItensCustodia(this.pageIndex, this.pageSize);
          },
          error: (err) =>
            this.lidarComErro(
              equipmentIds.length > 1
                ? 'Não foi possível alterar a custódia em lote. Verifique os IDs e tente novamente.'
                : 'Não foi possível alterar a custódia. Verifique os IDs e tente novamente.',
              err
            )
        })
    );
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.snackBar.open(mensagem, 'Fechar', { duration: 5000 });
    this.isLoading = false;
    this.dataSource = [];
    this.visibleCustodyItems = [];
    this.totalElements = 0;
  }

  private resolveManagerIdFromApiAndReload(page: number, size: number): void {
    if (this.resolvingManagerId) {
      this.lidarComErro('Não foi possível identificar o gerente logado (UUID).', null);
      return;
    }

    const username = localStorage.getItem('user')?.trim();
    if (!username) {
      this.lidarComErro('Não foi possível identificar o usuário logado.', null);
      return;
    }

    this.resolvingManagerId = true;
    this.subs.add(
      this.userService
        .listAll(0, 5000)
        .pipe(finalize(() => (this.resolvingManagerId = false)))
        .subscribe({
          next: (res: any) => {
            const list = Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : [];
            const found = list.find((u: any) => {
              const candidate =
                u?.username ??
                u?.userName ??
                u?.login ??
                u?.user ??
                u?.usuario ??
                u?.email;
              return String(candidate ?? '').trim() === username;
            });
            const id = String(found?.id ?? '').trim();
            if (this.isUuid(id)) {
              localStorage.setItem('userId', id);
              this.carregarItensCustodia(page, size);
              return;
            }
            this.lidarComErro('Não foi possível identificar o gerente logado (UUID).', null);
          },
          error: (err) => this.lidarComErro('Não foi possível identificar o gerente logado (UUID).', err)
        })
    );
  }

  private getLoggedManagerId(): string | null {
    return this.authService.getLoggedUserId();
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
