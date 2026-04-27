import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

import { EquipamentService } from '../services/equipament/equipment.service';
import { MovementService } from '../services/movement/movement.service';
import { LoanService } from '../services/loan/loan.service';
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { LoanType, UserSearchResponse } from '../models/loans/loans.model';

@Component({
  selector: 'app-preparation-loan',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ReactiveFormsModule, 
    MatCardModule, 
    MatTableModule,
    MatButtonModule, 
    MatIconModule, 
    MatDividerModule, 
    MatMenuModule, 
    MatToolbarModule,
    MatTooltipModule, 
    MatDialogModule, 
    MatChipsModule, 
    MatFormFieldModule, 
    MatInputModule,
    MatSelectModule, 
    MatSnackBarModule,
    MatAutocompleteModule
  ],
  templateUrl: './preparation-loan.component.html',
  styleUrls: ['./preparation-loan.component.css']
})
export class PreparationLoanComponent implements OnInit {
  equipamentId!: string;
  equipamento: any;
  historico: any[] = [];
  loanForm!: FormGroup;
  loanTypes: string[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  filteredUsers: UserSearchResponse[] = [];
  displayedColumns: string[] = ['dataHora', 'loanType', 'responsavel', 'projeto', 'observacao', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private movementService: MovementService,
    private loanService: LoanService,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const equipmentId = this.route.snapshot.paramMap.get('id');
    if (equipmentId) {
      this.equipamentId = equipmentId;
      this.carregarEquipamento();
    }

    this.loanForm.get('responsavel')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const search = typeof value === 'string' ? value : '';
        if (search.length >= 3) {
          return this.loanService.buscarColaboradores(search);
        }
        return of([]);
      })
    ).subscribe(users => {
      this.filteredUsers = users;
    });
  }

  private initForm(): void {
    this.loanForm = this.fb.group({
      loanType: ['', Validators.required],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      observacao: ['']
    });
  }

  displayFn(user: UserSearchResponse): string {
    return user && user.fullName ? user.fullName : '';
  }

  carregarEquipamento(): void {
    this.equipamentService.findById(this.equipamentId).subscribe({
      next: (res) => {
        this.equipamento = res;
        this.configurarOpcoesEmprestimo(this.equipamento?.statusName || '');
      }
    });

    this.movementService.findHistoryByEquipament(this.equipamentId, 0, 10).subscribe({
      next: (res: any) => this.historico = res.content || res
    });
  }

  configurarOpcoesEmprestimo(status: string): void {
    this.loanTypes = Object.values(LoanType);
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const novosArquivos = Array.from(files);
      this.selectedFiles = [...this.selectedFiles, ...novosArquivos];
      novosArquivos.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: any) => this.previsualizacoes.push(e.target.result);
        reader.readAsDataURL(file);
      });
    }
    event.target.value = '';
  }

  removerArquivo(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previsualizacoes.splice(index, 1);
  }

  onSubmit(): void {
    if (this.loanForm.invalid) return;

    const formValue = this.loanForm.value;

    const request = {
      equipmentId: this.equipamentId,
      colaboradorId: formValue.responsavel.id,
      helpdeskTicket: formValue.projeto,
      loanDate: new Date().toISOString(),
      observation: formValue.observacao
    };

    this.loanService.prepareLoan(request).subscribe({
      next: () => {
        this.snackBar.open('Empréstimo preparado com sucesso!', 'Sucesso', { duration: 3000 });
        this.router.navigate(['/equipaments']);
      },
      error: () => {
        this.snackBar.open('Erro ao salvar empréstimo.', 'Erro', { duration: 3000 });
      }
    });
  }

  private resetForm(): void {
    this.selectedFiles = [];
    this.previsualizacoes = [];
    this.loanForm.reset();
  }

  verFotos(e: any): void {
    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      data: { urls: e.imageUrls }
    });
  }

  voltar(): void {
    this.router.navigate(['/equipaments']);
  }
}