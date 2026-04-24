import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker'; 
import { MatNativeDateModule } from '@angular/material/core';

import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanService } from '../services/loan/loan.service';
import { UserService } from '../services/user/user.service';

// --- CORREÇÃO 1: Importando do lugar certo (pasta loans) ---
import { EquipmentLoanResponse } from '../models/loans/loans.model';
import { UserResponse } from '../models/users/UserResponse';
import { LoanRequest } from '../models/equipaments/equipament.model';

@Component({
  selector: 'app-loan-preparation',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    MatDatepickerModule, 
    MatNativeDateModule
  ],
  templateUrl: './loan-preparation.component.html',
  styleUrls: ['./loan-preparation.component.scss']
})
export class LoanPreparationComponent implements OnInit {
  loanForm: FormGroup;
  equipmentInfo: EquipmentLoanResponse | null = null;
  collaborators: UserResponse[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private equipmentService: EquipamentService,
    private loanService: LoanService,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {
    this.loanForm = this.fb.group({
      tomboSearch: ['', [Validators.required]],
      equipmentId: ['', [Validators.required]],
      colaboradorId: ['', [Validators.required]],
      loanDate: [new Date().toISOString().substring(0, 16), [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.carregarColaboradores();
  }

  carregarColaboradores(): void {
    this.userService.listAll().subscribe({
      next: (response: any) => {
        const listaBruta = response.content ? response.content : response;
        this.collaborators = listaBruta.filter((u: UserResponse) => u.roleName === 'COLABORADOR');
      },
      error: (err: any) => {
        console.error('Erro na requisição:', err);
        this.exibirMensagemErro('Erro ao carregar lista de colaboradores');
      }
    });
  }

  buscarEquipamento(): void {
    const topo = this.loanForm.get('tomboSearch')?.value;
    if (!topo) return;

    this.loading = true;
    this.loanService.findByCodeToLoan(topo).subscribe({
      // --- CORREÇÃO 2: Tipagem explícita no data ---
      next: (data: EquipmentLoanResponse) => {
        this.equipmentInfo = data;
        this.loanForm.patchValue({ equipmentId: data.id });
        this.loading = false;
      },
      error: (err: any) => {
        this.equipmentInfo = null;
        this.loading = false;
        this.exibirMensagemErro(err.error?.message || 'Equipamento não encontrado');
      }
    });
  }

  salvar(): void {
    if (this.loanForm.invalid || !this.equipmentInfo) {
      this.loanForm.markAllAsTouched();
      return;
    }

    const request: LoanRequest = {
      equipmentId: this.loanForm.value.equipmentId,
      colaboradorId: this.loanForm.value.colaboradorId,
      loanDate: this.loanForm.value.loanDate,
      helpdeskTicket: 'N/A',
      observation: 'Preparação iniciada via sistema'
    };

    // --- CORREÇÃO 3: Garantindo que o nome do método bata com o LoanService unificado ---
    this.loanService.prepareLoan(request).subscribe({
      next: () => {
        this.snackBar.open('Empréstimo iniciado!', 'OK', { duration: 3000 });
        this.router.navigate(['/loans']);
      },
      error: (err: any) => this.exibirMensagemErro(err.error?.message || 'Erro ao salvar')
    });
  }

  cancelar(): void {
    this.router.navigate(['/loans']); // Alterado para voltar para a sua lista
  }

  bloquearLetras(event: KeyboardEvent): void {
    const permitidas = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'];
    if (permitidas.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }

  private exibirMensagemErro(msg: string): void {
    this.snackBar.open(msg, 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
  }
}