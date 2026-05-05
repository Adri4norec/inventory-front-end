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
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { LoanService } from '../services/loan/loan.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanListResponse } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, normalizeStatusType, STATUS_TYPE_OPTIONS, StatusType, statusColorClass } from '../models/status/status-type';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatMenuModule, MatPaginatorModule, MatProgressBarModule, MatSnackBarModule
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
  statusFilterOptions = STATUS_TYPE_OPTIONS;
  private requestedStatusFilter: StatusType | null = null;

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
    if (this.requestedStatusFilter === StatusType.INDISPONIVEL) {
      filtrosParaApi.status = '';
    }

    this.loanService.advancedSearch(filtrosParaApi, page, size).subscribe({
      next: (response: any) => this.processarResposta(response),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private coerceApiDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private processarResposta(response: any): void {
    const baseList = this.sanitizeLoanData(response.content || []);
    
    this.totalElements = response.totalElements;
    this.pageIndex = response.number;

    const toCheck = this.getEquipmentsToCheck(baseList);

    if (toCheck.length === 0) {
      this.finalizeDataSource(baseList);
      return;
    }

    this.syncWithEquipmentApi(toCheck, baseList);
  }

  private sanitizeLoanData(content: LoanListResponse[]): LoanListResponse[] {
    return content
      .filter(item => item.status !== 'DISPONIVEL' || item.hasLoanHistory)
      .map(item => ({
        ...item,
        loanDate: this.coerceApiDate(item.loanDate) as any,
        returnDate: this.coerceApiDate(item.returnDate) as any
      }));
  }

  private getEquipmentsToCheck(list: LoanListResponse[]) {
    return list
      .filter(i => normalizeStatusType(i.status) === StatusType.DISPONIVEL)
      .map(i => ({ loan: i, equipmentId: (i.equipmentId || i.id) as string }))
      .filter(x => !!x.equipmentId);
  }

  private syncWithEquipmentApi(toCheck: any[], baseList: LoanListResponse[]): void {
    forkJoin(
      toCheck.map(({ equipmentId }) =>
        this.equipamentService.findById(equipmentId).pipe(
          map((eq: any) => ({ equipmentId, statusName: eq?.statusName })),
          catchError(() => of({ equipmentId, statusName: null }))
        )
      )
    ).subscribe({
      next: (results) => {
        const statusByEquipment = new Map<string, any>();
        results.forEach(r => statusByEquipment.set(r.equipmentId, r.statusName));

        const reconciled = baseList.map(item => {
          const equipmentId = item.equipmentId || item.id;
          const eqStatus = statusByEquipment.get(equipmentId);
          if (normalizeStatusType(eqStatus) === StatusType.INDISPONIVEL) {
            return { ...item, status: StatusType.INDISPONIVEL };
          }
          return item;
        });

        this.finalizeDataSource(reconciled);
      },
      error: () => this.finalizeDataSource(baseList)
    });
  }

  private finalizeDataSource(list: LoanListResponse[]): void {
    this.dataSource = this.applyRequestedStatusFilter(list);
    this.isLoading = false;
  }

  private applyRequestedStatusFilter(list: LoanListResponse[]): LoanListResponse[] {
    if (!this.requestedStatusFilter) return list;
    return list.filter(it => normalizeStatusType(it.status) === this.requestedStatusFilter);
  }

  isExtinto(status: unknown): boolean {
    return normalizeStatusType(status) === StatusType.INDISPONIVEL;
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