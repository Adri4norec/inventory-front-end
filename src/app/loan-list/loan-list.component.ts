import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

// import { LoanService } from '../../services/loan/loan.service';
// import { LoanResponse } from '../../models/loans/loan.model';

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
  
  dataSource: any[] = []; // Depois substitua 'any' por 'LoanResponse'

  constructor(
    // private loanService: LoanService
  ) {}

  ngOnInit(): void {
    this.loadLoans();
  }

  loadLoans(): void {
    // this.loanService.listAvailableAndInUse().subscribe(data => {
    //   this.dataSource = data;
    // });
  }

  performLoan(id: string): void {
    console.log('Abrir modal de empréstimo para o equipamento ID:', id);
  }

  registerReturn(id: string): void {
    console.log('Registrar devolução do equipamento ID:', id);
  }
}