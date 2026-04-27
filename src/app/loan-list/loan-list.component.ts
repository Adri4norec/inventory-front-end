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

import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse } from '../models/loans/loans.model';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatPaginatorModule,
    MatProgressBarModule
  ],
  templateUrl: './loan-list.component.html',
  styleUrls: ['./loan-list.component.scss']
})
export class LoanListComponent implements OnInit {
  
  displayedColumns: string[] = [
    'codigo', 
    'categoria', 
    'name', 
    'description', 
    'status', 
    'loanDate', 
    'expectedReturnDate', 
    'acoes'
  ];
  
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
    status: ''
  };

  constructor(private loanService: LoanService) {}

  ngOnInit(): void {
    this.carregarDados();
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
      status: ''
    };
    this.aplicarFiltros();
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;

    this.loanService.advancedSearch(this.filtros, page, size).subscribe({
      next: (response: any) => this.processarResposta(response),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private processarResposta(response: any): void {
    this.dataSource = response.content || [];
    this.totalElements = response.totalElements;
    this.pageIndex = response.number;
    this.isLoading = false;
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.isLoading = false;
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }

  formatStatus(status: string): string {
    const statusMap: any = {
      'DISPONIVEL': 'Disponível',
      'PREPARACAO': 'Em Preparação',
      'AGUARDANDO_ASSINATURA': 'Aguardando Assinatura',
      'ENTREGUE': 'Em Uso',
      'Em usu': 'Em Uso'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    if (status === 'DISPONIVEL') return 'badge-success';
    if (status === 'ENTREGUE' || status === 'Em usu') return 'badge-info';
    return 'badge-warning';
  }

  podeDevolver(status: string): boolean {
    return status === 'ENTREGUE' || status === 'Em usu';
  }

  performLoan(id: string): void {
    console.log('Iniciando empréstimo para ID:', id);
  }

  registerReturn(id: string): void {
    console.log('Registrando devolução para ID:', id);
  }
}