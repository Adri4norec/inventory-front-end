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
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { LayoutService } from '../services/layout/layout.service';
import { AuthService } from '../services/auth/auth.service';
import { LoanService } from '../services/loan/loan.service';
import { CustodiaResponse } from '../models/loans/loans.model';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

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
    ToolbarUserActionsComponent
  ],
  templateUrl: './asset-details.component.html',
  styleUrls: ['./asset-details.component.css']
})
export class AssetDetailsComponent implements OnInit, OnDestroy {
  assetId: string | null = null;
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
    private loanService: LoanService
  ) {}

  get custodianteAtualLabel(): string {
    return this.authService.getFullName() || localStorage.getItem('user') || '-';
  }

  ngOnInit(): void {
    this.assetId = this.route.snapshot.paramMap.get('id');

    const navState = this.router.getCurrentNavigation()?.extras?.state as { custodyHistory?: CustodiaResponse[] } | undefined;
    const historyState = (typeof history !== 'undefined' ? history.state : {}) as { custodyHistory?: CustodiaResponse[] };
    const fromState = navState?.custodyHistory ?? historyState?.custodyHistory;

    if (fromState?.length) {
      this.custodyHistory = fromState.map((item) => ({ ...item }));
      this.applyPageSlice(0);
      return;
    }

    this.loadCustodyHistoryFromApi();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /** Primeira movimentação do histórico → gerente; demais → colaborador daquela movimentação. */
  getCustodianteLabel(element: CustodiaResponse): string {
    const oldest = this.getOldestMovement();
    if (this.custodyHistory.length <= 1 || element?.id === oldest?.id) {
      return this.custodianteAtualLabel;
    }

    const nome = String(element?.custodianteNome ?? '').trim();
    return nome || this.custodianteAtualLabel;
  }

  private getOldestMovement(): CustodiaResponse | null {
    if (!this.custodyHistory.length) return null;
    return [...this.custodyHistory].sort((a, b) => this.compareCustodyRecency(a, b))[0] ?? null;
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

  private setCustodyHistory(history: CustodiaResponse[]): void {
    this.custodyHistory = history;
    this.applyPageSlice(0);
  }

  private loadCustodyHistoryFromApi(): void {
    const managerId = localStorage.getItem('userId')?.trim();
    const equipmentKey = String(this.assetId ?? '').trim();

    if (!managerId || !equipmentKey) {
      this.setCustodyHistory([]);
      return;
    }

    this.isLoading = true;
    this.subs.add(
      this.loanService
        .managerCustodyAdvancedSearch(
          managerId,
          { equipmentId: equipmentKey },
          0,
          AssetDetailsComponent.CUSTODY_FETCH_SIZE
        )
        .pipe(finalize(() => (this.isLoading = false)))
        .subscribe({
          next: (response) => {
            this.setCustodyHistory(this.mapCustodyHistory(response?.content ?? [], equipmentKey));
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
    return content
      .filter((item) => String(item?.equipmentId ?? '').trim() === equipmentKey)
      .map((item) => ({ ...item }))
      .sort((a, b) => this.compareCustodyRecency(b, a));
  }

  private compareCustodyRecency(a: CustodiaResponse, b: CustodiaResponse): number {
    const aTime = new Date(a?.inicioPeriodo ?? '').getTime();
    const bTime = new Date(b?.inicioPeriodo ?? '').getTime();

    if (!isNaN(aTime) && !isNaN(bTime) && aTime !== bTime) {
      return aTime - bTime;
    }

    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  }
}
