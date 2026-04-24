import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Importações do Serviço e Modelo
import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse } from '../models/loans/loans.model';

@Component({
  selector: 'app-loan-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule
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

  constructor(private loanService: LoanService) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    this.loanService.getLoansList().subscribe({
      next: (data) => {
        this.dataSource = data;
        console.log('Dados recebidos do Java:', data);
      },
      error: (err) => {
        console.error('Erro ao buscar lista de empréstimos do Java:', err);
      }
    });
  }

  performLoan(id: string): void {
    console.log('Abrir modal de empréstimo para o equipamento ID:', id);
  }

  registerReturn(id: string): void {
    console.log('Registrar devolução do equipamento ID:', id);
  }
}