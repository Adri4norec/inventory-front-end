import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of, catchError } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse, LoanType, UserSearchResponse } from '../models/loans/loans.model';

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
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './preparation-loan.component.html',
  styleUrls: ['./preparation-loan.component.css']
})
export class PreparationLoanComponent implements OnInit {
  equipamentId!: string;
  equipamento: any;
  loanForm!: FormGroup;
  loanTypes: { value: string, label: string }[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  pdfFile: File | null = null;
  filteredUsers: UserSearchResponse[] = [];
  currentLoanId?: string;
  isStatusUpdateMode = false;

  statusOptions = [
    { value: 'PREPARACAO', label: 'Preparação' },
    { value: 'PRONTO', label: 'Pronto' },
    { value: 'AGUARDANDO_DOCUMENTACAO', label: 'Aguardando Documentação' },
    { value: 'AGUARDANDO_ASSINATURA', label: 'Aguardando Assinatura' },
    { value: 'AGUARDANDO_RETIRADA', label: 'Aguardando Retirada' },
    { value: 'EM_USO', label: 'Em Uso' },
    { value: 'EMPRESTIMO_FINALIZADO', label: 'Finalizado' },
    { value: 'DEVOLVIDO', label: 'Devolvido' },
    { value: 'CANCELADO', label: 'Cancelado' }
  ];

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private loanService: LoanService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const loanId = this.route.snapshot.paramMap.get('loanId');
    const equipmentId = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    this.isStatusUpdateMode = loanId ? true : mode === 'status-only';

    if (loanId) {
      this.currentLoanId = loanId;
      this.carregarEmprestimo(loanId, this.isStatusUpdateMode);
    } else if (equipmentId) {
      this.equipamentId = equipmentId;
      this.carregarEquipamento();
    }

    this.loanForm.get('responsavel')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => {
        const search = typeof value === 'string' ? value : '';
        if (search.length >= 3) {
          return this.loanService.buscarColaboradores(search).pipe(
            catchError(() => of([]))
          );
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
      loanDate: [new Date(), Validators.required],
      returnDate: [null],
      observacao: ['']
    });
  }

  displayFn(user: UserSearchResponse): string {
    return user && user.fullName ? user.fullName : '';
  }

  carregarEquipamento(loan?: LoanListResponse, statusOnly?: boolean): void {
    this.equipamentService.findById(this.equipamentId).subscribe({
      next: (res) => {
        this.equipamento = res;
        this.configurarOpcoesEmprestimo();
        if (loan) {
          this.loanForm.patchValue({
            loanType: loan.status,
            projeto: loan.codigo,
            loanDate: loan.loanDate,
            returnDate: loan.returnDate,
            observacao: loan.description
          });
          if (statusOnly) {
            this.bloquearCamposExcetoStatus();
          }
        }
      }
    });
  }

  carregarEmprestimo(loanId: string, statusOnly: boolean): void {
    this.loanService.getLoanById(loanId).subscribe({
      next: (loan: LoanListResponse) => {
        if (loan.equipmentId) {
          this.equipamentId = loan.equipmentId;
          this.carregarEquipamento(loan, statusOnly);
        } else {
          this.equipamento = {
            id: loan.id,
            topo: loan.codigo,
            categoria: loan.categoria,
            name: loan.name,
            description: loan.description,
            statusName: loan.status,
            proprietaryName: (loan as any).proprietaryName,
            usageType: (loan as any).usageType,
            dateHour: (loan as any).dateHour
          };
          this.configurarOpcoesEmprestimo();
          this.loanForm.patchValue({
            loanType: loan.status,
            projeto: loan.codigo,
            loanDate: loan.loanDate,
            returnDate: loan.returnDate,
            observacao: loan.description
          });
          if (statusOnly) {
            this.bloquearCamposExcetoStatus();
          }
        }
      },
      error: (err) => console.error(err)
    });
  }

  bloquearCamposExcetoStatus(): void {
    const controlsToDisable = ['responsavel', 'projeto', 'loanDate', 'returnDate', 'observacao'];
    controlsToDisable.forEach(controlName => {
      this.loanForm.get(controlName)?.disable();
    });
    this.loanForm.get('loanType')?.enable();
  }

  configurarOpcoesEmprestimo(): void {
    if (this.isStatusUpdateMode) {
      this.loanTypes = [...this.statusOptions];
    } else {
      this.loanTypes = [this.statusOptions[0]];
    }
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

  private validatePdf(file: File | null | undefined): boolean {
    if (!file) return false;
    const nameOk = file.name?.toLowerCase().endsWith('.pdf');
    const typeOk = file.type?.toLowerCase() === 'application/pdf';
    return !!(nameOk || typeOk);
  }

  onPdfSelected(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (file && this.validatePdf(file)) {
      this.pdfFile = file;
    } else if (file) {
      this.snackBar.open('Apenas PDF é permitido.', 'OK', { duration: 3500 });
    }
    event.target.value = '';
  }

  removerPdf(): void {
    this.pdfFile = null;
  }

  onSubmit(): void {
    if (this.loanForm.invalid) return;

    if (this.isStatusUpdateMode && this.currentLoanId) {
      const statusParaEnviar = this.loanForm.get('loanType')?.value;

      this.loanService.updateLoanStatus(this.currentLoanId, statusParaEnviar).subscribe({
        next: () => {
          this.snackBar.open('Status atualizado com sucesso!', 'Sucesso', { duration: 3000 });
          this.router.navigate(['/loans']);
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Erro ao atualizar status.', 'Erro', { duration: 3000 });
        }
      });
      return;
    }

    const formValue = this.loanForm.getRawValue();
    const request = {
      equipmentId: this.equipamentId,
      colaboradorId: formValue.responsavel?.id,
      helpdeskTicket: formValue.projeto,
      loanDate: formValue.loanDate ? new Date(formValue.loanDate).toISOString() : new Date().toISOString(),
      returnDate: formValue.returnDate ? new Date(formValue.returnDate).toISOString() : null,
      observation: formValue.observacao
    };

    this.loanService.prepareLoan(request).subscribe({
      next: (response: any) => {
        const loanId: string | undefined = response?.id || this.currentLoanId;

        const hasDocs = !!this.pdfFile;

        if (!loanId) {
          if (hasDocs) {
            this.snackBar.open('Empréstimo salvo, mas não foi possível identificar o ID para enviar documentos.', 'Atenção', { duration: 4500 });
          } else {
            this.snackBar.open('Empréstimo preparado com sucesso!', 'Sucesso', { duration: 3000 });
          }
          this.router.navigate(['/equipaments']);
          return;
        }

        if (!hasDocs) {
          this.snackBar.open('Empréstimo preparado com sucesso!', 'Sucesso', { duration: 3000 });
          this.router.navigate(['/equipaments']);
          return;
        }

        this.loanService.uploadDocuments(loanId, [this.pdfFile!]).subscribe({
          next: () => {
            this.snackBar.open('Empréstimo preparado e documentos enviados!', 'Sucesso', { duration: 3000 });
            this.router.navigate(['/equipaments']);
          },
          error: (err) => {
            this.snackBar.open(err.error?.message || 'Empréstimo salvo, mas falha ao enviar documentos.', 'Erro', { duration: 4000 });
            this.router.navigate(['/equipaments']);
          }
        });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Erro ao salvar empréstimo.', 'Erro', { duration: 3000 });
      }
    });
  }

  voltar(): void {
    this.router.navigate(['/loans']);
  }

  formatarData(data: string | null | undefined): string {
    if (!data) return '-';
    try {
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) {
        return data;
      }
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const ano = dataObj.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return data;
    }
  }
}