import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription, forkJoin, of } from 'rxjs';
import { finalize, map, catchError } from 'rxjs/operators';

import { LayoutService } from '../services/layout/layout.service';
import { AuthService } from '../services/auth/auth.service';
import { LoanService } from '../services/loan/loan.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { EquipmentResponse } from '../models/equipaments/equipament.model';
import { CustodiaResponse } from '../models/loans/loans.model';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';
import {
  buildCustodyViewerIndex,
  filterMovementsByViewerIndex,
  mergeCustodyViewerIndex,
  mergeViewerIndexes,
  CustodyViewerRef,
  normalizePersonName
} from '../core/custody-owner.util';
import { readCustodyViewerPins } from '../core/custody-viewer-pins.util';

@Component({
  selector: 'app-asset-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatProgressBarModule,
    MatPaginatorModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.css']
})
export class AssetDetailsComponent implements OnInit, OnDestroy {
  assetId: string | null = null;
  equipamento: EquipmentResponse | null = null;
  /** Histórico completo (usado na lógica de labels e paginação local). */
  custodyHistory: CustodiaResponse[] = [];
  /** Fatia exibida na tabela conforme paginação. */
  dataSource: CustodiaResponse[] = [];
  displayedColumns: string[] = ['custodianteNome', 'inicioPeriodo', 'fimPeriodo'];
  isLoading = false;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  private readonly subs = new Subscription();
  private static readonly CUSTODY_FETCH_SIZE = 5000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public layout: LayoutService,
    private authService: AuthService,
    private loanService: LoanService,
    private equipamentService: EquipamentService
  ) {}

  ngOnInit(): void {
    this.assetId = this.route.snapshot.paramMap.get('id');
    this.loadEquipment();

    const navState = this.router.getCurrentNavigation()?.extras?.state as { custodyHistory?: CustodiaResponse[] } | undefined;
    const historyState = (typeof history !== 'undefined' ? history.state : {}) as { custodyHistory?: CustodiaResponse[] };
    const fromState = navState?.custodyHistory ?? historyState?.custodyHistory;

    if (fromState?.length) {
      this.setCustodyHistory(fromState.map((item) => ({ ...item })));
      return;
    }

    this.loadCustodyHistoryFromApi();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  get equipmentTombo(): string {
    const topo = String(this.equipamento?.topo ?? '').trim();
    const codigo = String(this.equipamento?.codigo ?? '').trim();
    return topo || codigo || String(this.assetId ?? '').trim() || '-';
  }

  get equipmentDescription(): string {
    return String(this.equipamento?.description ?? '').trim();
  }

  getCustodianteLabel(element: CustodiaResponse): string {
    const nome = String(element?.custodianteNome ?? '').trim();
    return nome || '-';
  }

  voltar(): void {
    this.router.navigate(['/area-gerente']);
  }

  handlePageEvent(event: PageEvent): void {
    this.applyPageSlice(event.pageIndex, event.pageSize);
  }

  private applyPageSlice(page = this.pageIndex, size = this.pageSize): void {
    this.pageIndex = page;
    this.pageSize = size;
    this.totalElements = this.custodyHistory.length;
    const start = page * size;
    this.dataSource = this.custodyHistory.slice(start, start + size);
  }

  /** Ordem da tabela: custódia mais recente no topo (independente da ordem da API ou do router state). */
  private setCustodyHistory(history: CustodiaResponse[]): void {
    this.custodyHistory = [...history].sort((a, b) => this.compareCustodyRecency(a, b));
    this.applyPageSlice(0);
  }

  private loadEquipment(): void {
    const equipmentKey = String(this.assetId ?? '').trim();
    if (!equipmentKey) return;

    const lookup$ = this.isUuid(equipmentKey)
      ? this.equipamentService.findById(equipmentKey)
      : this.equipamentService.advancedSearch({ tombo: equipmentKey }, 0, 1).pipe(
          map((response: { content?: EquipmentResponse[] }) => response?.content?.[0] ?? null),
          catchError(() => of(null))
        );

    this.subs.add(
      lookup$.pipe(catchError(() => of(null))).subscribe({
        next: (equipment) => {
          this.equipamento = equipment;
        }
      })
    );
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  private loadCustodyHistoryFromApi(): void {
    const managerId = this.authService.getLoggedUserId();
    const equipmentKey = String(this.assetId ?? '').trim();
    const loggedName = this.authService.getFullName()?.trim();

    if (!managerId || !equipmentKey) {
      this.setCustodyHistory([]);
      return;
    }

    const equipmentFilter = { equipmentId: equipmentKey, loanType: 'PROJECT' as const };
    const custodianFilter = {
      ...equipmentFilter,
      custodianteId: managerId,
      ...(loggedName ? { nome: loggedName } : {})
    };

    this.isLoading = true;
    this.subs.add(
      forkJoin({
        byManager: this.loanService
          .managerCustodyAdvancedSearch(managerId, equipmentFilter, 0, AssetDetailsComponent.CUSTODY_FETCH_SIZE)
          .pipe(catchError(() => of({ content: [] as CustodiaResponse[] }))),
        byCustodian: this.loanService
          .managerCustodyAdvancedSearch(managerId, custodianFilter, 0, AssetDetailsComponent.CUSTODY_FETCH_SIZE)
          .pipe(catchError(() => of({ content: [] as CustodiaResponse[] }))),
        byCustodianGlobal: this.loanService
          .managerCustodyAdvancedSearch(null, custodianFilter, 0, AssetDetailsComponent.CUSTODY_FETCH_SIZE)
          .pipe(catchError(() => of({ content: [] as CustodiaResponse[] }))),
        fromLoans: this.loanService.fetchProjectCustodyAsCustodian(managerId, loggedName, equipmentKey)
      })
        .pipe(
          map(({ byManager, byCustodian, byCustodianGlobal, fromLoans }) => {
            const merged = new Map<string, CustodiaResponse>();
            for (const group of [
              byManager.content ?? [],
              byCustodian.content ?? [],
              byCustodianGlobal.content ?? [],
              fromLoans
            ]) {
              for (const item of group) {
                const key = String(item?.id ?? item?.equipmentId ?? '').trim();
                if (key && !merged.has(key)) merged.set(key, item);
              }
            }
            return Array.from(merged.values());
          }),
          finalize(() => (this.isLoading = false))
        )
        .subscribe({
          next: (content) => {
            this.setCustodyHistory(this.mapCustodyHistory(content, equipmentKey));
          },
          error: (err) => {
            if (this.loanService.isManagerCustodyAdvancedSearchUnavailable(err)) {
              this.loadCustodyHistoryFromLegacyApi(managerId, equipmentKey);
              return;
            }
            this.setCustodyHistory([]);
          }
        })
    );
  }

  private loadCustodyHistoryFromLegacyApi(managerId: string, equipmentKey: string): void {
    this.subs.add(
      this.loanService.getManagerCustody(managerId, 0, AssetDetailsComponent.CUSTODY_FETCH_SIZE).subscribe({
        next: (response) => {
          this.setCustodyHistory(this.mapCustodyHistory(response?.content ?? [], equipmentKey));
        },
        error: () => {
          this.setCustodyHistory([]);
        }
      })
    );
  }

  private mapCustodyHistory(content: CustodiaResponse[], equipmentKey: string): CustodiaResponse[] {
    const equipmentMovements = content
      .filter((item) => String(item?.equipmentId ?? '').trim() === equipmentKey)
      .map((item) => ({ ...item }));

    if (!equipmentMovements.length) return [];

    const historyIndex = buildCustodyViewerIndex(content);
    const fromLoansIndex = buildCustodyViewerIndex(equipmentMovements);
    const pins = readCustodyViewerPins();
    const viewerIndex = mergeCustodyViewerIndex(
      mergeViewerIndexes(historyIndex, fromLoansIndex),
      pins
    );

    const visible = filterMovementsByViewerIndex(
      equipmentMovements,
      this.authService.getLoggedUserId(),
      this.getLoggedPersonNames(),
      viewerIndex,
      pins
    );

    return visible.length ? equipmentMovements : [];
  }

  private getLoggedPersonNames(): Set<string> {
    const names = new Set<string>();
    const fullName = normalizePersonName(this.authService.getFullName());
    const username = normalizePersonName(localStorage.getItem('user'));
    if (fullName) names.add(fullName);
    if (username) names.add(username);
    return names;
  }

  private parseCustodyDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Mesma regra da Área do Gerente (verDetalhes): início mais recente primeiro;
   * empate por vigência (fim futuro/em aberto antes de encerrado).
   */
  private compareCustodyRecency(a: CustodiaResponse, b: CustodiaResponse): number {
    const aTime = this.parseCustodyDate(a?.inicioPeriodo)?.getTime() ?? Number.NEGATIVE_INFINITY;
    const bTime = this.parseCustodyDate(b?.inicioPeriodo)?.getTime() ?? Number.NEGATIVE_INFINITY;

    if (aTime !== bTime) {
      return bTime - aTime;
    }

    const aOpenEnded = !a?.fimPeriodo;
    const bOpenEnded = !b?.fimPeriodo;
    if (aOpenEnded !== bOpenEnded) {
      return aOpenEnded ? -1 : 1;
    }

    if (!aOpenEnded && !bOpenEnded) {
      const aEnd = this.parseCustodyDate(a?.fimPeriodo)?.getTime() ?? Number.NEGATIVE_INFINITY;
      const bEnd = this.parseCustodyDate(b?.fimPeriodo)?.getTime() ?? Number.NEGATIVE_INFINITY;
      if (aEnd !== bEnd) {
        return bEnd - aEnd;
      }
    }

    return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
  }

  private custodyEndScore(fimPeriodo?: string | null): number {
    if (!fimPeriodo) return Number.POSITIVE_INFINITY;
    return this.parseCustodyDate(fimPeriodo)?.getTime() ?? 0;
  }
}
