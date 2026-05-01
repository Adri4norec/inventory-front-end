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

import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';

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
  
  displayedColumns: string[] = ['codigo', 'categoria', 'name', 'description', 'status', 'loanDate', 'expectedReturnDate', 'acoes'];
  dataSource: LoanListResponse[] = []; 
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  filtros = { codigo: '', categoria: '', nome: '', caracteristicas: '', status: '' };

  constructor(
    private loanService: LoanService,
    private router: Router,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  obterProximoStatus(statusAtual: string): string | null {
    const esteira: { [key: string]: string } = {
      'EM_PREPARO': 'PRONTO',
      'PRONTO': 'AGUARDANDO_DOCUMENTACAO',
      'AGUARDANDO_DOCUMENTACAO': 'AGUARDANDO_ASSINATURA',
      'AGUARDANDO_ASSINATURA': 'AGUARDANDO_RETIRADA',
      'AGUARDANDO_RETIRADA': 'EMPRESTIMO_FINALIZADO'
    };
    return esteira[statusAtual] || null;
  }

  avancarEtapa(item: LoanListResponse): void {
    const novoStatus = this.obterProximoStatus(item.status);
    if (!novoStatus) return;

    this.isLoading = true;
    this.loanService.updateLoanStatus(item.id, novoStatus).subscribe({
      next: () => {
        this.snackBar.open(`Status atualizado: ${this.formatStatus(novoStatus)}`, 'OK', { duration: 3000 });
        this.carregarDados();
      },
      error: (err) => this.lidarComErro('Erro ao atualizar status', err)
    });
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

  performLoan(id: string): void {
    console.log('Iniciando empréstimo para ID:', id);
  }

  openPreparationScreen(item: LoanListResponse): void {
    this.router.navigate(['/loans', item.id, 'preparation-loan']);
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.loanService.advancedSearch(this.filtros, page, size).subscribe({
      next: (response: any) => this.processarResposta(response),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private processarResposta(response: any): void {
    this.dataSource = (response.content || []).filter((item: LoanListResponse) => {
      if (item.status !== 'DISPONIVEL') return true;
      return item.hasLoanHistory === true;
    });
    this.totalElements = response.totalElements;
    this.pageIndex = response.number;
    this.isLoading = false;
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.snackBar.open(mensagem, 'Fechar', { duration: 5000 });
    this.isLoading = false;
  }

  formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'DISPONIVEL': 'Disponível',
      'EM_PREPARO': 'Preparo',
      'PREPARACAO': 'Preparação',
      'PRONTO': 'Pronto para Uso',
      'AGUARDANDO_DOCUMENTACAO': 'Aguardando Documentos',
      'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura',
      'AGUARDANDO_RETIRADA': 'Aguardando Retirada',
      'EMPRESTIMO_FINALIZADO': 'Finalizado',
      'EM_DEVOLUCAO': 'Em Devolução',
      'DEVOLVIDO': 'Devolvido'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    if (status === 'DISPONIVEL') return 'badge-success';
    if (status === 'EMPRESTIMO_FINALIZADO') return 'badge-success';
    if (status === 'EM_PREPARO' || status === 'PREPARACAO') return 'badge-warning';
    if (status === 'EM_DEVOLUCAO') return 'badge-warning';
    return 'badge-info';
  }

  podeAvancar(status: string): boolean {
    return !!this.obterProximoStatus(status);
  }

  podeDevolver(status: string): boolean {
    return status === 'EMPRESTIMO_FINALIZADO';
  }

  podeFinalizarDevolucao(status: string): boolean {
    return status === 'EM_DEVOLUCAO';
  }

  aplicarFiltros(): void { this.pageIndex = 0; this.carregarDados(); }
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