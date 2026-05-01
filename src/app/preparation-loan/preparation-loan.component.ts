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
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanService } from '../services/loan/loan.service';
import { LoanListResponse, UserSearchResponse } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';
import { STATUS_TYPE_LABEL, STATUS_TYPE_OPTIONS, StatusType } from '../models/status/status-type';

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
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatAutocompleteModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule
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
  writeOffPdfFile: File | null = null;
  filteredUsers: UserSearchResponse[] = [];
  currentLoanId?: string;
  isStatusUpdateMode = false;
  screenMode: 'default' | 'return-support' | 'return-admin' = 'default';
  isSaving = false;
  isReturnFromUsoFlow = false;
  isPreparationDefaultStep = false;

  statusOptions = STATUS_TYPE_OPTIONS;

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private loanService: LoanService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const loanId = this.route.snapshot.paramMap.get('loanId');
    const equipmentId = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');

    this.screenMode = (mode === 'return-support' || mode === 'return-admin') ? mode : 'default';
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

    this.loanForm.get('enviadoSedex')?.valueChanges.subscribe(enviado => {
      const dataSedexControl = this.loanForm.get('dataSedex');
      if (enviado) {
        dataSedexControl?.setValidators([Validators.required]);
      } else {
        dataSedexControl?.clearValidators();
        dataSedexControl?.setValue(null);
      }
      dataSedexControl?.updateValueAndValidity();
    });
  }

  private initForm(): void {
    this.loanForm = this.fb.group({
      loanType: ['', Validators.required],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      loanDate: [new Date(), Validators.required],
      returnDate: [null],
      observacao: [''],
      enviadoSedex: [false],
      dataSedex: [null]
    });
  }

  private isPreparationStatus(raw: unknown): boolean {
    if (!raw) return false;
    const v = String(raw).toUpperCase().trim();
    return v === StatusType.EM_PREPARACAO || v === 'PREPARACAO' || v === 'EM_PREPARO';
  }

  private applyPreparationDefaultStepRules(currentLoanStatus?: unknown): void {
    if (!this.equipamento) return;
    if (this.isReturnSupportMode || this.isReturnAdminMode || this.isReturnFromUsoFlow) return;

    const equipmentStatus = this.equipamento?.statusName as unknown;
    const inPreparation = this.isPreparationStatus(currentLoanStatus) || this.isPreparationStatus(equipmentStatus);
    if (!inPreparation) {
      this.isPreparationDefaultStep = false;
      return;
    }

    this.isPreparationDefaultStep = true;

    const defaultStatus = StatusType.AGUARDANDO_ASSINATURA;
    this.loanForm.patchValue({ loanType: defaultStatus });

    const controlsToDisable = [
      'loanType',
      'responsavel',
      'projeto',
      'loanDate',
      'returnDate',
      'observacao',
      'enviadoSedex',
      'dataSedex'
    ];
    controlsToDisable.forEach((controlName) => this.loanForm.get(controlName)?.disable());

    this.loanTypes = [{ value: defaultStatus, label: STATUS_TYPE_LABEL[defaultStatus] }];
  }

  displayFn(user: UserSearchResponse): string {
    return user && user.fullName ? user.fullName : '';
  }

  get pageTitle(): string {
    if (this.isReturnFromUsoFlow || this.screenMode === 'return-support' || this.screenMode === 'return-admin') {
      return 'Devolução de Equipamento';
    }
    return 'Preparação de Empréstimo';
  }

  get isReturnSupportMode(): boolean {
    return this.screenMode === 'return-support';
  }

  get isReturnAdminMode(): boolean {
    return this.screenMode === 'return-admin';
  }

  private applyScreenModeRules(currentStatus?: string): void {
    if (!this.currentLoanId) return;

    if (this.isReturnSupportMode) {
      if (currentStatus !== StatusType.EM_USO) {
        this.snackBar.open('Fluxo de devolução (suporte) disponível apenas quando o status está EM_USO.', 'OK', { duration: 4500 });
        this.router.navigate(['/loans']);
        return;
      }

      this.loanForm.patchValue({ loanType: StatusType.EM_DEVOLUCAO });
      Object.keys(this.loanForm.controls).forEach((key) => this.loanForm.get(key)?.disable());

      this.selectedFiles = [];
      this.previsualizacoes = [];
      this.pdfFile = null;
      this.writeOffPdfFile = null;
      return;
    }

    if (this.isReturnAdminMode) {
      if (currentStatus !== StatusType.EM_DEVOLUCAO) {
        this.snackBar.open('Finalização disponível apenas quando o status está EM_DEVOLUCAO.', 'OK', { duration: 4500 });
        this.router.navigate(['/loans']);
        return;
      }

      Object.keys(this.loanForm.controls).forEach((key) => this.loanForm.get(key)?.disable());

      this.selectedFiles = [];
      this.previsualizacoes = [];
      this.pdfFile = null;
      this.writeOffPdfFile = null;
    }
  }

  private setupReturnFromUsoFlow(): void {
    if (!this.currentLoanId) return;
    this.isReturnFromUsoFlow = true;

    this.loanForm.patchValue({ loanType: StatusType.EM_DEVOLUCAO });
    Object.keys(this.loanForm.controls).forEach((key) => this.loanForm.get(key)?.disable());

    this.selectedFiles = [];
    this.previsualizacoes = [];
    this.pdfFile = null;
    this.writeOffPdfFile = null;
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
            observacao: loan.description,
            enviadoSedex: loan.enviadoSedex,
            dataSedex: loan.dataSedex
          });
          this.applyScreenModeRules(loan.status);
          if (this.isStatusUpdateMode && !this.isReturnSupportMode && !this.isReturnAdminMode && loan.status === StatusType.EM_USO) {
            this.setupReturnFromUsoFlow();
          }
          if (this.isStatusUpdateMode && this.screenMode === 'default' && loan.status === StatusType.EM_DEVOLUCAO) {
            this.screenMode = 'return-admin';
            this.applyScreenModeRules(loan.status);
          }
          if (statusOnly && !this.isReturnFromUsoFlow && !this.isReturnSupportMode && !this.isReturnAdminMode) {
            this.bloquearCamposExcetoStatus();
          }
        }

        this.applyPreparationDefaultStepRules(loan?.status);
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
            observacao: loan.description,
            enviadoSedex: loan.enviadoSedex,
            dataSedex: loan.dataSedex
          });
          this.applyScreenModeRules(loan.status);
          if (this.isStatusUpdateMode && !this.isReturnSupportMode && !this.isReturnAdminMode && loan.status === StatusType.EM_USO) {
            this.setupReturnFromUsoFlow();
          }
          if (this.isStatusUpdateMode && this.screenMode === 'default' && loan.status === StatusType.EM_DEVOLUCAO) {
            this.screenMode = 'return-admin';
            this.applyScreenModeRules(loan.status);
          }
          if (statusOnly && !this.isReturnFromUsoFlow && !this.isReturnSupportMode && !this.isReturnAdminMode) {
            this.bloquearCamposExcetoStatus();
          }

          this.applyPreparationDefaultStepRules(loan.status);
        }
      },
      error: (err) => console.error(err)
    });
  }

  bloquearCamposExcetoStatus(): void {
    const controlsToDisable = [
      'responsavel',
      'projeto',
      'loanDate',
      'returnDate',
      'observacao',
      'enviadoSedex',
      'dataSedex'
    ];
    controlsToDisable.forEach(controlName => {
      this.loanForm.get(controlName)?.disable();
    });
    this.loanForm.get('loanType')?.enable();
  }

  configurarOpcoesEmprestimo(): void {
    if (this.isStatusUpdateMode) {
      this.loanTypes = [...this.statusOptions];
    } else {
      // Na criação do empréstimo (vindo da listagem de equipamentos), o status inicial deve ser EM_PREPARACAO.
      const initial = this.statusOptions.find((o) => o.value === StatusType.EM_PREPARACAO) ?? this.statusOptions[0];
      this.loanTypes = [initial];
      this.loanForm.patchValue({ loanType: initial.value });
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

  onWriteOffPdfSelected(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (file && this.validatePdf(file)) {
      this.writeOffPdfFile = file;
    } else if (file) {
      this.snackBar.open('Apenas PDF é permitido.', 'OK', { duration: 3500 });
    }
    event.target.value = '';
  }

  removerWriteOffPdf(): void {
    this.writeOffPdfFile = null;
  }

  onSubmit(): void {
    if (this.isSaving) return;

    if (this.isReturnFromUsoFlow) {
      if (!this.currentLoanId) return;
      if (this.selectedFiles.length < 1) {
        this.snackBar.open('Selecione ao menos 1 foto para iniciar a devolução.', 'OK', { duration: 3500 });
        return;
      }

      this.isSaving = true;
      const loanId = this.currentLoanId;

      this.loanService.registerSupportReturn(loanId, this.selectedFiles).pipe(
        switchMap(() => this.pdfFile ? this.loanService.uploadDocuments(loanId, [this.pdfFile]) : of([]))
      ).subscribe({
        next: () => {
          this.snackBar.open('Devolução iniciada! Status atualizado para EM_DEVOLUCAO.', 'Sucesso', { duration: 3000 });
          this.router.navigate(['/loans']);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Erro ao iniciar devolução.', 'Erro', { duration: 4000 });
        }
      });
      return;
    }

    if (this.isReturnSupportMode) {
      if (!this.currentLoanId) return;
      if (this.selectedFiles.length < 1) {
        this.snackBar.open('Selecione ao menos 1 foto para registrar a devolução.', 'OK', { duration: 3500 });
        return;
      }

      this.isSaving = true;
      this.loanService.registerSupportReturn(this.currentLoanId, this.selectedFiles).subscribe({
        next: () => {
          this.snackBar.open('Devolução registrada com sucesso!', 'Sucesso', { duration: 3000 });
          this.router.navigate(['/loans']);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Erro ao registrar devolução.', 'Erro', { duration: 4000 });
        }
      });
      return;
    }

    if (this.isReturnAdminMode) {
      if (!this.currentLoanId) return;
      if (this.selectedFiles.length < 1) {
        this.snackBar.open('Selecione ao menos 1 foto para finalizar e liberar.', 'OK', { duration: 3500 });
        return;
      }
      if (!this.writeOffPdfFile) {
        this.snackBar.open('Faça upload do Termo de Baixa Assinado (PDF) para finalizar e liberar.', 'OK', { duration: 3500 });
        return;
      }

      this.isSaving = true;
      this.loanService.finalizeReturnAndReleaseEquipmentWithDocs(this.currentLoanId, this.selectedFiles, this.writeOffPdfFile).subscribe({
        next: () => {
          this.snackBar.open('Devolução finalizada e equipamento liberado!', 'Sucesso', { duration: 3000 });
          this.router.navigate(['/loans']);
        },
        error: (err) => {
          this.isSaving = false;
          this.snackBar.open(err.error?.message || 'Erro ao finalizar devolução.', 'Erro', { duration: 4000 });
        }
      });
      return;
    }

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
      observation: formValue.observacao,
      enviadoSedex: formValue.enviadoSedex,
      dataSedex: formValue.dataSedex ? new Date(formValue.dataSedex).toISOString() : null
    };

    this.isSaving = true;
    this.loanService.prepareLoan(request).subscribe({
      next: (response: any) => {
        this.isSaving = false;
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
        this.isSaving = false;
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