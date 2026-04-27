import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse } from '../models/loans/loans.model';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatCardModule,
    MatButtonModule, MatIconModule, MatToolbarModule, MatTooltipModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatPaginatorModule, MatProgressBarModule, MatSnackBarModule
  ],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.scss']
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
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  // Lógica da esteira de status
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

  registerReturn(id: string): void {
    if (!confirm('Deseja confirmar a devolução deste equipamento?')) return;

    this.isLoading = true;
    this.loanService.registerReturn(id).subscribe({
      next: () => {
        this.snackBar.open('Equipamento devolvido com sucesso.', 'OK', { duration: 3000 });
        this.carregarDados();
      },
      error: (err) => this.lidarComErro('Erro ao registrar devolução', err)
    });
  }

  performLoan(id: string): void {
    console.log('Iniciando empréstimo para ID:', id);
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.loanService.advancedSearch(this.filtros, page, size).subscribe({
      next: (response: any) => this.processarResposta(response),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private processarResposta(response: any): void {
    this.dataSource = (response.content || []).filter(
      (item: LoanListResponse) => item.status !== 'DISPONIVEL'
    );
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
      'EM_PREPARO': 'Em Preparo',
      'PRONTO': 'Pronto para Uso',
      'AGUARDANDO_DOCUMENTACAO': 'Aguardando Documentos',
      'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura',
      'AGUARDANDO_RETIRADA': 'Aguardando Retirada',
      'EMPRESTIMO_FINALIZADO': 'Empréstimo Finalizado',
      'DEVOLVIDO': 'Devolvido'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    if (status === 'EMPRESTIMO_FINALIZADO') return 'badge-success';
    if (status === 'EM_PREPARO') return 'badge-warning';
    return 'badge-info';
  }

  podeAvancar(status: string): boolean {
    return !!this.obterProximoStatus(status);
  }

  podeDevolver(status: string): boolean {
    return status === 'EMPRESTIMO_FINALIZADO';
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