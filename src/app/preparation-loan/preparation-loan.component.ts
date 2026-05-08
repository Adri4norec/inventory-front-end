import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, EMPTY, Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, concatMap, finalize, catchError, tap } from 'rxjs/operators';

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
import { UserService } from '../services/user/user.service';
import { LoanDetailResponse, LoanListResponse, UserSearchResponse } from '../models/loans/loans.model';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, STATUS_TYPE_LABEL, STATUS_TYPE_OPTIONS, StatusType, normalizeStatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

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
    MatCheckboxModule,
    ToolbarUserActionsComponent
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
  isTermoEnabled = true;
  isFotosEnabled = true;
  isAssinaturaBaixaFlow = false;
  private lastResponsavelLookupId: string | null = null;

  statusOptions = STATUS_TYPE_OPTIONS;

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private loanService: LoanService,
    private userService: UserService,
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

    this.loanForm.get('loanType')?.valueChanges.subscribe((value) => {
      this.applyAssinaturaToBaixaRules(value);
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

  private coerceApiDate(value?: string | Date | null): Date | null {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  private resolveReturnDate(loan: LoanListResponse): Date | null {
    return this.coerceApiDate((loan as any).returnDate ?? null);
  }

  private coerceResponsavel(raw: unknown): UserSearchResponse | null {
    if (!raw) return null;
    if (typeof raw === 'string') {
      const fullName = raw.trim();
      return fullName ? ({ id: '', fullName } as UserSearchResponse) : null;
    }
    if (typeof raw === 'object') {
      const anyRaw = raw as any;
      const fullName = String(
        anyRaw.fullName ??
        anyRaw.full_name ??
        anyRaw.nome ??
        anyRaw.name ??
        anyRaw.colaboradorName ??
        anyRaw.collaboratorName ??
        ''
      ).trim();
      const id = String(
        anyRaw.id ??
        anyRaw.colaboradorId ??
        anyRaw.userId ??
        anyRaw.collaboratorId ??
        ''
      ).trim();
      if (!fullName) return null;
      return { id, fullName };
    }
    return null;
  }

  private extractColaboradorId(loan: any): string {
    if (!loan) return '';
    const direct = String(
      loan.colaboradorId ??
      loan.colaboradorID ??
      loan.responsavelId ??
      loan.responsibleId ??
      loan.userId ??
      loan.usuarioId ??
      loan.collaboratorId ??
      loan.employeeId ??
      ''
    ).trim();
    if (direct) return direct;
    const nested =
      loan.colaborador ??
      loan.responsavel ??
      loan.responsible ??
      loan.usuario ??
      loan.user ??
      loan.collaborator ??
      loan.employee;
    const nestedId = String(
      nested?.id ??
      nested?.colaboradorId ??
      nested?.userId ??
      nested?.usuarioId ??
      nested?.employeeId ??
      ''
    ).trim();
    return nestedId;
  }

  private patchLoanFormFromLoan(loan: Partial<LoanDetailResponse & LoanListResponse>): void {
    if (!loan) return;
    const responsavel =
      this.coerceResponsavel((loan as any).responsavel) ??
      this.coerceResponsavel((loan as any).fullName) ??
      this.coerceResponsavel((loan as any).colaboradorName) ??
      this.coerceResponsavel((loan as any).collaboratorName) ??
      this.coerceResponsavel((loan as any).colaborador) ??
      null;

    const responsavelControlValue: any =
      this.isStatusUpdateMode
        ? (responsavel?.fullName ?? (typeof (loan as any).responsavel === 'string' ? (loan as any).responsavel : '') ?? '')
        : responsavel;

    this.loanForm.patchValue({
      loanType: (loan as any).status ?? this.loanForm.get('loanType')?.value,
      responsavel: responsavelControlValue,
      projeto: (loan as any).helpdeskTicket ??
        (loan as any).helpdesk_ticket ??
        (loan as any).helpDeskTicket ??
        (loan as any).projeto ??
        (loan as any).project ??
        '',
      loanDate: this.coerceApiDate((loan as any).loanDate) ?? new Date(),
      returnDate: this.coerceApiDate((loan as any).returnDate) ?? null,
      observacao: (loan as any).observation ?? (loan as any).description ?? '',
      enviadoSedex: (loan as any).enviadoSedex ?? false,
      dataSedex: this.coerceApiDate((loan as any).dataSedex) ?? null
    });

    const colaboradorId = this.extractColaboradorId(loan as any);
    const alreadyHasName = !!(responsavel && responsavel.fullName);
    if (!alreadyHasName && colaboradorId) {
      this.loadResponsavelById(colaboradorId);
    }
  }

  private loadResponsavelById(colaboradorId: string): void {
    if (!colaboradorId) return;
    if (this.lastResponsavelLookupId === colaboradorId) return;
    this.lastResponsavelLookupId = colaboradorId;

    this.userService.findById(colaboradorId).subscribe({
      next: (u: any) => {
        const fullName = String(u?.fullName ?? '').trim();
        if (!fullName) return;
        const value: any = this.isStatusUpdateMode ? fullName : { id: colaboradorId, fullName };
        this.loanForm.patchValue({ responsavel: value }, { emitEvent: false });
      },
      error: () => {
        // Silencioso: não bloqueia tela se não achar.
      }
    });
  }

  getStatusClass(status: unknown): string {
    return statusColorClass(status);
  }

  formatStatusLabel(raw: unknown): string {
    return formatStatusLabel(raw);
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
    const formStatus = this.loanForm?.get('loanType')?.value as unknown;
    const inPreparation =
      this.isPreparationStatus(currentLoanStatus) ||
      this.isPreparationStatus(formStatus) ||
      this.isPreparationStatus(equipmentStatus);
    if (!inPreparation) {
      this.isPreparationDefaultStep = false;
      this.isTermoEnabled = true;
      if (!this.isStatusUpdateMode) {
        this.loanForm.get('loanType')?.enable();
      }
      return;
    }

    this.isPreparationDefaultStep = true;

    if (this.isStatusUpdateMode) {
      const defaultStatus = StatusType.AGUARDANDO_ASSINATURA;
      this.loanForm.patchValue({ loanType: defaultStatus }, { emitEvent: false });
      this.loanTypes = [{ value: defaultStatus, label: STATUS_TYPE_LABEL[defaultStatus] }];
    }

    this.loanForm.get('loanType')?.disable();
    this.isTermoEnabled = false;

    if (!this.isStatusUpdateMode) {
      const controlsToEnable = [
        'responsavel',
        'projeto',
        'loanDate',
        'returnDate',
        'observacao',
        'enviadoSedex',
        'dataSedex'
      ];
      controlsToEnable.forEach((controlName) => this.loanForm.get(controlName)?.enable());
    }
  }

  displayFn(user: UserSearchResponse | string | null): string {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user.fullName || '';
  }

  get shouldShowLoanDetailsFields(): boolean {
    if (!this.isReturnSupportMode && !this.isReturnFromUsoFlow) return true;

    const st = normalizeStatusType(this.loanForm?.get('loanType')?.value);
    return st === StatusType.EM_DEVOLUCAO;
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

      const aguardandoBaixa = StatusType.AGUARDANDO_BAIXA;
      this.loanForm.patchValue({ loanType: aguardandoBaixa });
      this.loanTypes = [{ value: aguardandoBaixa, label: STATUS_TYPE_LABEL[aguardandoBaixa] }];

      this.isFotosEnabled = false;
      this.isTermoEnabled = false;

      Object.keys(this.loanForm.controls).forEach((key) => this.loanForm.get(key)?.disable());

      this.selectedFiles = [];
      this.previsualizacoes = [];
      this.pdfFile = null;
      this.writeOffPdfFile = null;
    }
  }

  private applyAssinaturaToBaixaRules(currentStatus?: unknown): void {
    if (!this.currentLoanId) return;
    if (!this.isStatusUpdateMode) return;
    if (this.isReturnSupportMode || this.isReturnAdminMode || this.isReturnFromUsoFlow) return;

    const effective = normalizeStatusType(this.loanForm.get('loanType')?.value ?? currentStatus);
    if (effective !== StatusType.AGUARDANDO_ASSINATURA) {
      this.isAssinaturaBaixaFlow = false;
      this.isTermoEnabled = true;
      this.isFotosEnabled = true;
      return;
    }

    this.isAssinaturaBaixaFlow = true;
    this.isTermoEnabled = true;
    this.isFotosEnabled = false;

    this.selectedFiles = [];
    this.previsualizacoes = [];
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
    this.isTermoEnabled = false;
  }

  carregarEquipamento(loan?: LoanListResponse, statusOnly?: boolean): void {
    this.equipamentService.findById(this.equipamentId).subscribe({
      next: (res) => {
        this.equipamento = res;
        this.configurarOpcoesEmprestimo();
        if (loan) {
          this.patchLoanFormFromLoan(loan as any);
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
        this.applyAssinaturaToBaixaRules(loan?.status);
      }
    });
  }

  carregarEmprestimo(loanId: string, statusOnly: boolean): void {
    this.loanService.getLoanById(loanId).subscribe({
      next: (loan: LoanDetailResponse & LoanListResponse) => {
        if (loan.equipmentId) {
          this.equipamentId = loan.equipmentId;
          this.carregarEquipamento(loan as any, statusOnly);
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
          this.patchLoanFormFromLoan(loan as any);
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
          this.applyAssinaturaToBaixaRules(loan.status);
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
      const initial = this.statusOptions.find((o) => o.value === StatusType.EM_PREPARACAO) ?? this.statusOptions[0];
      this.loanTypes = [initial];
      this.loanForm.patchValue({ loanType: initial.value });
    }

    this.applyPreparationDefaultStepRules();
  }

  onFileSelected(event: any): void {
    if (!this.isFotosEnabled) {
      event.target.value = '';
      return;
    }
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
    if (!this.isFotosEnabled) return;
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
    if (!this.isTermoEnabled) {
      event.target.value = '';
      return;
    }
    const file: File | undefined = event.target.files?.[0];
    if (file && this.validatePdf(file)) {
      this.pdfFile = file;
    } else if (file) {
      this.snackBar.open('Apenas PDF é permitido.', 'OK', { duration: 3500 });
    }
    event.target.value = '';
  }

  removerPdf(): void {
    if (!this.isTermoEnabled) return;
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
    if (!this.validateContext()) return;

    this.isSaving = true;

    const flow$: Observable<unknown> =
      this.isReturnFromUsoFlow
        ? this.handleSupportReturn(true)
        : this.isReturnSupportMode
          ? this.handleSupportReturn(false)
          : this.isReturnAdminMode
            ? this.handleAdminReturn()
            : this.isStatusUpdateMode
              ? this.handleStatusUpdate()
              : this.handleNewLoan();

    flow$
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe();
  }

  private validateContext(): boolean {
    if (this.isReturnFromUsoFlow || this.isReturnSupportMode || this.isReturnAdminMode || this.isStatusUpdateMode) {
      if (!this.currentLoanId) {
        return false;
      }
    }

    if (this.isReturnFromUsoFlow) {
      if (this.selectedFiles.length < 1) {
        this.snackBar.open('Selecione ao menos 1 foto para iniciar a devolução.', 'OK', { duration: 3500 });
        return false;
      }
      return true;
    }

    if (this.isReturnSupportMode) {
      if (this.selectedFiles.length < 1) {
        this.snackBar.open('Selecione ao menos 1 foto para registrar a devolução.', 'OK', { duration: 3500 });
        return false;
      }
      return true;
    }

    if (this.isReturnAdminMode) {
      if (!this.writeOffPdfFile) {
        this.snackBar.open('Faça upload do Termo de Baixa Assinado (PDF) para finalizar e liberar.', 'OK', { duration: 3500 });
        return false;
      }
      return true;
    }

    if (this.isStatusUpdateMode) {
      if (this.loanForm.invalid) return false;
      if (this.isAssinaturaBaixaFlow && !this.pdfFile) {
        this.snackBar.open('Anexe o Termo de Responsabilidade (PDF) para concluir.', 'OK', { duration: 3500 });
        return false;
      }
      return true;
    }

    // Novo empréstimo (fluxo padrão)
    if (this.loanForm.invalid) return false;
    return true;
  }

  private handleSupportReturn(isUsoFlow: boolean) {
    const loanId = this.currentLoanId as string;
    const request$ = this.loanService.registerSupportReturn(loanId, this.selectedFiles).pipe(
      concatMap(() => (isUsoFlow && this.pdfFile) ? this.loanService.uploadDocuments(loanId, [this.pdfFile]) : of([]))
    );

    return request$.pipe(
      tap(() => {
        const msg = isUsoFlow
          ? 'Devolução iniciada! Status atualizado para EM_DEVOLUCAO.'
          : 'Devolução registrada com sucesso!';
        this.finalizeSuccess(msg, '/loans');
      }),
      catchError((err) => {
        const defaultMsg = isUsoFlow ? 'Erro ao iniciar devolução.' : 'Erro ao registrar devolução.';
        this.showError(err, defaultMsg);
        return EMPTY;
      })
    );
  }

  private handleAdminReturn() {
    const loanId = this.currentLoanId as string;
    const pdf = this.writeOffPdfFile as File;
    return this.loanService.finalizeReturnAndReleaseEquipment(loanId, pdf).pipe(
      tap(() => this.finalizeSuccess('Devolução finalizada e equipamento liberado!', '/loans')),
      catchError((err) => {
        this.showError(err, 'Erro ao finalizar devolução.');
        return EMPTY;
      })
    );
  }

  private handleStatusUpdate() {
    const loanId = this.currentLoanId as string;

    if (this.isAssinaturaBaixaFlow) {
      const pdf = this.pdfFile as File;
      return this.loanService.uploadDocuments(loanId, [pdf]).pipe(
        concatMap(() => this.loanService.updateLoanStatus(loanId, StatusType.EM_USO)),
        tap(() => this.finalizeSuccess('Termo anexado. Status atualizado para EM_USO.', '/loans')),
        catchError((err) => {
          this.showError(err, 'Erro ao atualizar status.');
          return EMPTY;
        })
      );
    }

    const statusParaEnviar = this.loanForm.get('loanType')?.value;
    return this.loanService.updateLoanStatus(loanId, statusParaEnviar).pipe(
      tap(() => this.finalizeSuccess('Status atualizado com sucesso!', '/loans')),
      catchError((err) => {
        this.showError(err, 'Erro ao atualizar status.');
        return EMPTY;
      })
    );
  }

  private handleNewLoan() {
    const request = this.mapFormToRequest();

    return this.loanService.prepareLoan(request).pipe(
      concatMap((response: any) => {
        const loanId: string | undefined = response?.id || this.currentLoanId;
        const hasDocs = !!this.pdfFile;

        if (!loanId) {
          if (hasDocs) {
            this.snackBar.open('Empréstimo salvo, mas não foi possível identificar o ID para enviar documentos.', 'Atenção', { duration: 4500 });
          } else {
            this.snackBar.open('Empréstimo preparado com sucesso!', 'Sucesso', { duration: 3000 });
          }
          this.router.navigate(['/equipaments']);
          return of(null);
        }

        if (!hasDocs) {
          this.finalizeSuccess('Empréstimo preparado com sucesso!', '/equipaments');
          return of(null);
        }

        return this.loanService.uploadDocuments(loanId, [this.pdfFile!]).pipe(
          tap(() => this.finalizeSuccess('Empréstimo preparado e documentos enviados!', '/equipaments')),
          catchError((err) => {
            this.showError(err, 'Empréstimo salvo, mas falha ao enviar documentos.');
            this.router.navigate(['/equipaments']);
            return of(null);
          })
        );
      }),
      catchError((err) => {
        this.showError(err, 'Erro ao salvar empréstimo.');
        return EMPTY;
      })
    );
  }

  private mapFormToRequest() {
    const formValue = this.loanForm.getRawValue();
    return {
      equipmentId: this.equipamentId,
      colaboradorId: formValue.responsavel?.id,
      helpdeskTicket: formValue.projeto,
      loanDate: formValue.loanDate ? new Date(formValue.loanDate).toISOString() : new Date().toISOString(),
      returnDate: formValue.returnDate ? new Date(formValue.returnDate).toISOString() : null,
      observation: formValue.observacao,
      enviadoSedex: formValue.enviadoSedex,
      dataSedex: formValue.dataSedex ? new Date(formValue.dataSedex).toISOString() : null
    };
  }

  private finalizeSuccess(message: string, route: string): void {
    this.snackBar.open(message, 'Sucesso', { duration: 3000 });
    this.router.navigate([route]);
  }

  private showError(err: any, defaultMsg: string): void {
    this.snackBar.open(err?.error?.message || defaultMsg, 'Erro', { duration: 4000 });
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

  get equipmentCodeLabel(): string {
    const topo = this.equipamento?.topo;
    const codigo = this.equipamento?.codigo;
    const id = this.equipamento?.id;
    return (topo ?? codigo ?? id ?? '-') as string;
  }
}