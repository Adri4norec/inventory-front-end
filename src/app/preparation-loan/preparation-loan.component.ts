import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of, EMPTY, Observable, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, concatMap, finalize, catchError, tap, startWith, map } from 'rxjs/operators';

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
import { MatRadioModule } from '@angular/material/radio';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EquipamentService } from '../services/equipament/equipment.service';
import { LoanService } from '../services/loan/loan.service';
import { PerPartService } from '../services/per-part/per-part.service';
import { PerPartResponse } from '../models/per-part/per-part.model';
import { UserService } from '../services/user/user.service';
import {
  LoanAcessorioResponse,
  LoanDetailResponse,
  LoanListResponse,
  LoanRequest,
  LoanType,
  UserSearchResponse
} from '../models/loans/loans.model';
import { LoanRefreshService } from '../services/loan/loan-refresh.service';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, STATUS_TYPE_LABEL, STATUS_TYPE_OPTIONS, StatusType, normalizeStatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';
import { ImageLightboxComponent } from '../shared/components/image-lightbox/image-lightbox.component';
import { AutocompleteCreateComponent } from '../shared/components/autocomplete-create/autocomplete-create.component';
import { writeCustodyViewerPin } from '../core/custody-viewer-pins.util';
import { environment } from '../../environments/environment';
import { provideBrazilianDate } from '../core/provide-brazilian-date';

@Component({
  selector: 'app-preparation-loan',
  standalone: true,
  providers: [...provideBrazilianDate()],
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
    MatRadioModule,
    MatDialogModule,
    ToolbarUserActionsComponent,
    AutocompleteCreateComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './preparation-loan.component.html',
  styleUrls: ['./preparation-loan.component.css']
})
export class PreparationLoanComponent implements OnInit {
  equipamentId!: string;
  equipamento: any;
  loanForm!: FormGroup;
  accessoryControl = new FormControl<PerPartResponse | string | null>(null);
  accessoryQuantityControl = new FormControl<number>(1, [Validators.required, Validators.min(1)]);
  filteredPerParts: Observable<PerPartResponse[]> = of([]);
  availablePerParts: PerPartResponse[] = [];
  selectedAccessory: PerPartResponse | null = null;
  addedAccessories: Array<{
    perPartId: string;
    name: string;
    quantity: number;
    availableQuantity: number;
    originalTotalQuantity: number;
  }> = [];
  accessoryError: string | null = null;
  loanTypes: { value: string, label: string }[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  pdfFile: File | null = null;

  private readonly apiBase = environment.apiUrl;
  imagensSalvas: Array<{ id: string; url: string }> = [];
  imagensMantidasIds: string[] = [];
  imagensExcluidasIds: string[] = [];
  writeOffPdfFile: File | null = null;
  filteredUsers: UserSearchResponse[] = [];
  currentLoanId?: string;
  loanDetails: LoanDetailResponse | null = null;
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
    private perPartService: PerPartService,
    private userService: UserService,
    private router: Router,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private loanRefreshService: LoanRefreshService,
    public layout: LayoutService,
    private dialog: MatDialog
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

    this.onSearchResponsavel('');

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
      if (!this.currentLoanId) return;
      if (value === 'PROJECT' || value === 'PERSONAL') {
        this.loanService.rememberLoanType(this.currentLoanId, value);
      }
    });

    this.setupAccessoryFiltering();
    this.loadAvailablePerParts();

    this.loanForm.get('loanStatus')?.valueChanges.subscribe((value) => {
      this.applyAssinaturaToBaixaRules(value);
    });
  }

  private initForm(): void {
    this.loanForm = this.fb.group({
      loanType: ['', Validators.required],
      loanStatus: ['', Validators.required],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      loanDate: [new Date(), Validators.required],
      returnDate: [null],
      observacao: [''],
      enviadoSedex: [false],
      dataSedex: [null]
    });
  }

  private setupAccessoryFiltering(): void {
    this.filteredPerParts = this.accessoryControl.valueChanges.pipe(
      startWith(''),
      tap((value) => {
        if (!value || typeof value === 'string') {
          this.selectedAccessory = null;
        }
      }),
      map((value) => (typeof value === 'string' ? value : value?.name ?? '')),
      map((search) => this.filterPerParts(search))
    );
  }

  private loadAvailablePerParts(): void {
    this.perPartService.listAvailable().pipe(
      catchError(() => of<PerPartResponse[]>([]))
    ).subscribe((list) => {
      this.availablePerParts = (list ?? []).filter((item) => item.responsavel == null);
    });
  }

  getAccessoryOptionLabel(item: PerPartResponse): string {
    if (item.quantity === 0) {
      return `${item.name} — (Indisponível / Esgotado)`;
    }
    return `${item.name} — (${item.quantity} restantes)`;
  }

  private filterPerParts(search: string): PerPartResponse[] {
    const query = (search ?? '').toLowerCase().trim();
    if (!query) {
      return this.availablePerParts;
    }
    return this.availablePerParts.filter((item) =>
      item.name?.toLowerCase().includes(query)
    );
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

  /** Normaliza tipo vindo da API (loanType, tipoEmprestimo, PROJETO/PESSOAL, etc.). */
  private extractLoanType(loan: unknown): LoanType | null {
    if (!loan || typeof loan !== 'object') return null;
    const record = loan as Record<string, unknown>;
    const raw =
      record['loanType'] ??
      record['tipoEmprestimo'] ??
      record['tipo_emprestimo'] ??
      record['loan_type'];
    return this.normalizeLoanTypeValue(raw);
  }

  private normalizeLoanTypeValue(raw: unknown): LoanType | null {
    if (raw == null) return null;
    if (typeof raw === 'object') {
      const obj = raw as Record<string, unknown>;
      return this.normalizeLoanTypeValue(obj['name'] ?? obj['value'] ?? obj['code'] ?? obj['id']);
    }
    const normalized = String(raw).trim().toUpperCase();
    if (!normalized) return null;
    if (normalized === 'PROJECT' || normalized === 'PROJETO') return 'PROJECT';
    if (normalized === 'PERSONAL' || normalized === 'PESSOAL') return 'PERSONAL';
    return null;
  }

  /** Garante valor no radio mesmo quando o controle está desabilitado (devolução, em uso, etc.). */
  private setLoanTypeControl(loanType: LoanType): void {
    const control = this.loanForm.get('loanType');
    if (!control) return;
    if (control.disabled) {
      control.enable({ emitEvent: false });
      control.setValue(loanType, { emitEvent: false });
      control.disable({ emitEvent: false });
    } else {
      control.setValue(loanType, { emitEvent: false });
    }
  }

  private syncLoanTypeFromLoan(loan: Partial<LoanDetailResponse & LoanListResponse> | undefined): void {
    const loanType = this.extractLoanType(loan) ?? this.extractLoanType(this.loanDetails);
    if (loanType) {
      this.setLoanTypeControl(loanType);
    }
  }

  private patchLoanFormFromLoan(loan: Partial<LoanDetailResponse & LoanListResponse>): void {
    if (!loan) return;

    const colaboradorId = this.extractColaboradorId(loan as any);

    this.loanForm.patchValue({
      loanStatus: (loan as any).status ?? this.loanForm.get('loanStatus')?.value,
      responsavel: colaboradorId || '',
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

    if (colaboradorId) {
      this.loadResponsavelById(colaboradorId);
    }

    if (Array.isArray((loan as any).acessorios)) {
      this.setLoanAccessories((loan as any).acessorios as LoanAcessorioResponse[]);
    }

    this.syncLoanTypeFromLoan(loan);
  }

  private setLoanAccessories(acessorios: LoanAcessorioResponse[]): void {
    this.addedAccessories = acessorios.map((item) => ({
      perPartId: item.perPartId,
      name: item.name,
      quantity: item.quantidadeEmprestada,
      availableQuantity: item.quantidadeEmprestada,
      originalTotalQuantity: item.originalTotalQuantity
    }));
  }

  private loadResponsavelById(colaboradorId: string): void {
    if (!colaboradorId) return;
    if (this.lastResponsavelLookupId === colaboradorId) return;
    this.lastResponsavelLookupId = colaboradorId;

    this.userService.findById(colaboradorId).subscribe({
      next: (u: any) => {
        const fullName = String(u?.fullName ?? '').trim();
        if (!fullName) return;
        this.filteredUsers = [{ id: colaboradorId, fullName } as UserSearchResponse, ...this.filteredUsers.filter(x => x.id !== colaboradorId)];
        this.loanForm.patchValue({ responsavel: colaboradorId }, { emitEvent: false });
      },
      error: () => {
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
    const formStatus = this.loanForm?.get('loanStatus')?.value as unknown;
    const inPreparation =
      this.isPreparationStatus(currentLoanStatus) ||
      this.isPreparationStatus(formStatus) ||
      this.isPreparationStatus(equipmentStatus);
    if (!inPreparation) {
      this.isPreparationDefaultStep = false;
      this.isTermoEnabled = true;
      if (!this.isStatusUpdateMode) {
        this.loanForm.get('loanStatus')?.enable();
      }
      return;
    }

    this.isPreparationDefaultStep = true;

    if (this.isStatusUpdateMode) {
      this.loanForm.get('loanStatus')?.disable();
    }
    this.isTermoEnabled = false;

    if (!this.isStatusUpdateMode) {
      const controlsToEnable = [
        'loanType',
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

  onSearchResponsavel(term: string): void {
    const search = term?.trim() ?? '';
    this.loanService.buscarColaboradores(search || '').pipe(
      catchError(() => of([]))
    ).subscribe(users => {
      this.filteredUsers = users;
    });
  }

  displayAccessoryFn(item: PerPartResponse | string | null): string {
    if (!item) return '';
    return typeof item === 'string' ? item : item.name || '';
  }

  /** Sedex: em formulário desabilitado, .value do controle pode vir vazio — usa getRawValue/loanDetails. */
  get isEnviadoSedexChecked(): boolean {
    return !!this.loanForm.getRawValue().enviadoSedex || !!this.loanDetails?.enviadoSedex;
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
      const statusOk =
        currentStatus === StatusType.EM_USO || currentStatus === StatusType.EM_DEVOLUCAO;
      if (!statusOk) {
        this.snackBar.open(
          'Fluxo de devolução (suporte) disponível apenas quando o status está EM_USO ou EM_DEVOLUCAO.',
          'OK',
          { duration: 4500 }
        );
        this.router.navigate(['/loans']);
        return;
      }

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

    const effective = normalizeStatusType(this.loanForm.get('loanStatus')?.value ?? currentStatus);
    if (!this.isPreparationStatus(effective)) {
      this.isAssinaturaBaixaFlow = false;
      this.isTermoEnabled = true;
      this.isFotosEnabled = true;
      return;
    }

    this.isAssinaturaBaixaFlow = true;
    this.isTermoEnabled = true;
    this.isFotosEnabled = false;
  }

  private setupReturnFromUsoFlow(): void {
    if (!this.currentLoanId) return;
    this.isReturnFromUsoFlow = true;

    // Desabilita todos os campos de formulário para leitura-apenas
    Object.keys(this.loanForm.controls).forEach((key) => {
      this.loanForm.get(key)?.disable({ emitEvent: false });
    });

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
        if (res.imageUrls?.length) {
          this.inicializarGaleria(res.imageUrls);
        }
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
        if (loan) {
          this.syncLoanTypeFromLoan(loan as any);
        }
      }
    });
  }

  carregarEmprestimo(loanId: string, statusOnly: boolean): void {
    this.loanService.getLoanById(loanId).subscribe({
      next: (loan: LoanDetailResponse) => {
        this.loanDetails = loan;
        if (loan.equipmentId) {
          this.equipamentId = loan.equipmentId;
          this.carregarEquipamento(loan as any, statusOnly);
        } else {
          this.equipamento = {
            loanId: loan.id,
            topo: (loan as any).codigo,
            categoria: (loan as any).categoria,
            name: (loan as any).name,
            description: (loan as any).description,
            statusName: loan.status,
            proprietaryName: (loan as any).proprietaryName,
            usageType: (loan as any).usageType,
            dateHour: (loan as any).dateHour
          };

          this.tryLoadEquipmentImages(loan as any);

          const imageUrls = (loan as any).imageUrls;
          if (imageUrls?.length) {
            this.inicializarGaleria(imageUrls);
          }

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
          this.syncLoanTypeFromLoan(loan as any);
        }
      },
      error: (err) => console.error(err)
    });
  }

  bloquearCamposExcetoStatus(): void {
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
    controlsToDisable.forEach(controlName => {
      this.loanForm.get(controlName)?.disable();
    });
    this.loanForm.get('loanStatus')?.enable();
  }

  configurarOpcoesEmprestimo(): void {
    if (this.isStatusUpdateMode) {
      this.loanTypes = this.statusOptions.filter(
        (o) => !LoanService.PATCH_FORBIDDEN_STATUSES.has(o.value)
      );
    } else {
      const initial = this.statusOptions.find((o) => o.value === StatusType.EM_PREPARACAO) ?? this.statusOptions[0];
      this.loanTypes = [initial];
      this.loanForm.patchValue({ loanStatus: initial.value });
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

  inicializarGaleria(imagensDaApi: string[]): void {
    this.imagensSalvas = (imagensDaApi ?? []).map((url, i) => {
      const fullUrl = (url.startsWith('http') || url.startsWith('data:'))
        ? url
        : `${this.apiBase}/uploads/${url}`;
      return { id: url, url: fullUrl };
    });
    this.imagensMantidasIds = this.imagensSalvas.map(img => img.id);
    this.imagensExcluidasIds = [];
  }

  removerFotoSalva(id: string): void {
    if (!this.isFotosEnabled) return;
    this.imagensMantidasIds = this.imagensMantidasIds.filter(mid => mid !== id);
    if (!this.imagensExcluidasIds.includes(id)) {
      this.imagensExcluidasIds.push(id);
    }
    this.imagensSalvas = this.imagensSalvas.filter(img => img.id !== id);
  }

  abrirLightbox(imageUrl: string): void {
    this.dialog.open(ImageLightboxComponent, {
      data: { imageUrl },
      panelClass: 'lightbox-dialog-panel',
      backdropClass: 'lightbox-dialog-backdrop',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh',
    });
  }

  get totalFotos(): number {
    return this.imagensSalvas.length + this.previsualizacoes.length;
  }

  onAccessorySelected(accessory: PerPartResponse): void {
    this.selectedAccessory = accessory;
    this.accessoryControl.setValue(accessory, { emitEvent: false });
    this.accessoryError = null;
  }

  onAccessoryInputFocus(): void {
    // Dispara o valueChanges para carregar a lista de acessórios ao focar no campo
    if (!this.accessoryControl.value) {
      this.accessoryControl.setValue('', { emitEvent: true });
    }
  }

  addAccessoryToLoan(): void {
    this.accessoryError = null;

    if (!this.selectedAccessory) {
      this.accessoryError = 'Selecione um acessório antes de adicionar.';
      return;
    }

    const quantity = this.accessoryQuantityControl.value ?? 1;
    if (quantity < 1) {
      this.accessoryError = 'Quantidade inválida.';
      return;
    }

    if (quantity > this.selectedAccessory.quantity) {
      this.accessoryError = `Quantidade solicitada maior que o estoque disponível (${this.selectedAccessory.quantity}).`;
      return;
    }

    const accessoryId = this.selectedAccessory.id;
    const alreadyAdded = this.addedAccessories.find((item) => item.perPartId === accessoryId);
    if (alreadyAdded) {
      this.accessoryError = 'Este acessório já foi adicionado ao empréstimo.';
      return;
    }

    this.addedAccessories = [
      ...this.addedAccessories,
      {
        perPartId: accessoryId,
        name: this.selectedAccessory.name,
        quantity,
        availableQuantity: this.selectedAccessory.quantity,
        originalTotalQuantity: this.selectedAccessory.originalTotalQuantity ?? this.selectedAccessory.quantity
      }
    ];

    this.accessoryControl.setValue(null, { emitEvent: false });
    this.accessoryQuantityControl.setValue(1);
    this.selectedAccessory = null;
  }

  removeAccessory(index: number): void {
    this.addedAccessories.splice(index, 1);
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

  onDownloadOriginalTermClick(): void {
    const loanId = this.loanDetails?.id ?? this.currentLoanId;
    if (!loanId) {
      return;
    }

    if (!this.loanDetails?.hasOriginalTerm) {
      this.snackBar.open('Documento original não encontrado.', 'OK', { duration: 4000 });
      return;
    }

    this.downloadTermoOriginal(loanId);
  }

  downloadTermoOriginal(loanId: string): void {
    this.loanService.downloadOriginalTerm(loanId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `termo_original_${loanId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Erro ao baixar o termo original', err);
        this.showError(err, 'Erro ao efetuar o download do documento físico.');
      },
    });
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
      if (this.selectedFiles.length < 1 && this.imagensExcluidasIds.length < 1) {
        this.snackBar.open(
          'Selecione ao menos 1 foto nova ou altere as fotos existentes.',
          'OK',
          { duration: 3500 }
        );
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
      if (this.loanForm.invalid) {
        this.loanForm.markAllAsTouched();
        return false;
      }
      return true;
    }

    // Novo empréstimo (fluxo padrão)
    if (this.loanForm.invalid) {
      this.loanForm.markAllAsTouched();
      return false;
    }
    return true;
  }

  private handleSupportReturn(isUsoFlow: boolean) {
    const loanId = this.currentLoanId as string;
    const equipmentId = this.equipamentId || this.loanDetails?.equipmentId || '';
    const request$ = this.loanService
      .registerSupportReturn(loanId, this.imagensMantidasIds, this.selectedFiles)
      .pipe(
        concatMap(() =>
          isUsoFlow && this.pdfFile
            ? this.loanService.uploadDocuments(loanId, [this.pdfFile])
            : of([])
        ),
        concatMap(() =>
          equipmentId
            ? this.equipamentService.syncEquipmentPhotos(equipmentId).pipe(catchError(() => of(null)))
            : of(null)
        )
      );

    return request$.pipe(
      tap(() => {
        if (isUsoFlow) {
          this.loanForm.patchValue({ loanStatus: StatusType.EM_DEVOLUCAO });
        }
        this.loanRefreshService.notifyRefresh();
        this.loadAvailablePerParts();
        const msg = isUsoFlow
          ? 'Devolução iniciada! Status atualizado para EM_DEVOLUCAO.'
          : 'Fotos de devolução registradas com sucesso!';
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
      tap(() => {
        this.loanRefreshService.notifyRefresh();
        this.reloadDadosAposFinalizacao('Devolução finalizada e equipamento liberado!');
      }),
      catchError((err) => {
        this.showError(err, 'Erro ao finalizar devolução.');
        return EMPTY;
      })
    );
  }

  private handleStatusUpdate() {
    const loanId = this.currentLoanId as string;
    const equipmentId = this.equipamentId || this.loanDetails?.equipmentId || '';

    console.log('[handleStatusUpdate] loanId:', loanId, 'equipmentId:', equipmentId,
      'isAssinaturaBaixaFlow:', this.isAssinaturaBaixaFlow, 'pdfFile:', !!this.pdfFile);

    if (this.isAssinaturaBaixaFlow) {
      const syncImages$ = this.buildImageSync$(equipmentId);

      if (!this.pdfFile) {
        return syncImages$.pipe(
          tap(() => this.finalizeSuccess('Fotos atualizadas com sucesso!', '/loans')),
          catchError((err) => {
            this.showError(err, 'Erro ao atualizar fotos.');
            return EMPTY;
          })
        );
      }

      return this.loanService.uploadDocuments(loanId, [this.pdfFile]).pipe(
        concatMap(() => syncImages$),
        concatMap(() => this.loanService.updateLoanStatus(loanId, StatusType.EM_USO)),
        tap(() => this.finalizeSuccess('Termo anexado. Status atualizado para EM_USO.', '/loans')),
        catchError((err) => {
          this.showError(err, 'Erro ao atualizar status.');
          return EMPTY;
        })
      );
    }

    const statusParaEnviar = this.loanForm.get('loanStatus')?.value;
    if (LoanService.PATCH_FORBIDDEN_STATUSES.has(String(statusParaEnviar))) {
      this.snackBar.open(
        'Os status Em Devolução e Devolvido só podem ser definidos pelo fluxo de devolução (fotos + termo PDF).',
        'OK',
        { duration: 5000 }
      );
      return EMPTY;
    }

    const syncImages$ = this.buildImageSync$(equipmentId);

    return syncImages$.pipe(
      concatMap(() => this.loanService.updateLoanStatus(loanId, statusParaEnviar)),
      tap(() => this.finalizeSuccess('Status atualizado com sucesso!', '/loans')),
      catchError((err) => {
        this.showError(err, 'Erro ao atualizar status.');
        return EMPTY;
      })
    );
  }

  private buildImageSync$(equipmentId?: string): Observable<unknown> {
    const hasDeltas = this.imagensExcluidasIds.length > 0 || this.selectedFiles.length > 0;
    console.log('[buildImageSync$] equipmentId:', equipmentId);
    console.log('[buildImageSync$] imagensExcluidasIds:', this.imagensExcluidasIds);
    console.log('[buildImageSync$] selectedFiles.length:', this.selectedFiles.length);
    console.log('[buildImageSync$] imagensMantidasIds:', this.imagensMantidasIds);
    console.log('[buildImageSync$] hasDeltas:', hasDeltas);
    if (!hasDeltas || !equipmentId) {
      console.warn('[buildImageSync$] SKIPPING sync — hasDeltas:', hasDeltas, 'equipmentId:', equipmentId);
      return of(null);
    }
    return this.syncEquipmentImageDeltas(equipmentId).pipe(catchError(() => of(null)));
  }

  private handleNewLoan() {
    const request = this.mapFormToRequest();
    const equipmentId = this.equipamentId || '';
    const hasNewPhotos = this.selectedFiles.length > 0;
    const hasImageDeltas = this.imagensExcluidasIds.length > 0 || hasNewPhotos;

    return this.loanService.prepareLoan(request).pipe(
      concatMap((response: any) => {
        const loanId: string | undefined = response?.id || this.currentLoanId;
        const hasDocs = !!this.pdfFile;

        const uploadDocs$ = (hasDocs && loanId)
          ? this.loanService.uploadDocuments(loanId, [this.pdfFile!]).pipe(catchError(() => of(null)))
          : of(null);

        const syncImages$ = (hasImageDeltas && equipmentId)
          ? this.syncEquipmentImageDeltas(equipmentId).pipe(catchError(() => of(null)))
          : of(null);

        return forkJoin([uploadDocs$, syncImages$]).pipe(
          tap(() => {
            this.rememberProjectCustodyViewer(request, loanId);
            this.loanRefreshService.notifyRefresh();
            this.finalizeSuccess('Empréstimo preparado com sucesso!', '/loans');
          }),
          catchError(() => {
            this.loanRefreshService.notifyRefresh();
            this.snackBar.open('Empréstimo salvo, mas falha ao enviar documentos/imagens.', 'Atenção', { duration: 4500 });
            this.router.navigate(['/loans']);
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

  private tryLoadEquipmentImages(loan: any): void {
    const tombo = (loan?.codigo ?? loan?.topo ?? '').toString().trim();
    if (!tombo) return;

    this.equipamentService.advancedSearch({ tombo }, 0, 1).pipe(
      catchError(() => of({ content: [] }))
    ).subscribe((res: any) => {
      const eq = res?.content?.[0];
      if (eq) {
        if (eq.id) this.equipamentId = eq.id;
        if (eq.imageUrls?.length) this.inicializarGaleria(eq.imageUrls);
      }
    });
  }

  private syncEquipmentImageDeltas(equipmentId: string): Observable<string[]> {
    console.log('[syncEquipmentImageDeltas] CHAMANDO manageImages com:');
    console.log('  equipmentId:', equipmentId);
    console.log('  keepUrls (imagensMantidasIds):', JSON.stringify(this.imagensMantidasIds));
    console.log('  newFiles count:', this.selectedFiles.length);
    this.selectedFiles.forEach((f, i) => console.log(`  file[${i}]:`, f.name, f.size, f.type));

    return this.equipamentService.manageImages(
      equipmentId,
      this.imagensMantidasIds,
      this.selectedFiles
    ).pipe(
      tap((result) => console.log('[syncEquipmentImageDeltas] RESULTADO do backend:', result)),
      catchError((err) => {
        console.error('[syncEquipmentImageDeltas] ERRO:', err);
        return of([]);
      })
    );
  }

  private rememberProjectCustodyViewer(request: LoanRequest, loanId?: string | null): void {
    if (request.loanType !== 'PROJECT') return;

    const viewerId = String(request.colaboradorId ?? '').trim();
    if (!viewerId) return;

    const equipmentKeys = new Set(
      [
        String(this.equipmentCodeLabel ?? '').trim(),
        String(this.equipamentId ?? '').trim(),
        String(request.equipmentId ?? '').trim(),
        String(loanId ?? '').trim()
      ].filter(Boolean)
    );

    equipmentKeys.forEach((key) => writeCustodyViewerPin(key, viewerId));
  }

  private mapFormToRequest(): LoanRequest {
    const formValue = this.loanForm.getRawValue();
    const colaboradorId = formValue.responsavel ? String(formValue.responsavel) : '';
    return {
      equipmentId: this.equipamentId,
      colaboradorId,
      loanType: formValue.loanType as LoanType,
      helpdeskTicket: formValue.projeto ?? '',
      loanDate: formValue.loanDate ? new Date(formValue.loanDate).toISOString() : new Date().toISOString(),
      returnDate: formValue.returnDate ? new Date(formValue.returnDate).toISOString() : null,
      observation: formValue.observacao ?? null,
      enviadoSedex: !!formValue.enviadoSedex,
      dataSedex: formValue.dataSedex ? new Date(formValue.dataSedex).toISOString() : null,
      acessorios: this.addedAccessories.map((item) => ({
        perPartId: item.perPartId,
        quantity: item.quantity
      }))
    };
  }

  private reloadDadosAposFinalizacao(message: string): void {
    const loanId = this.currentLoanId;
    if (!loanId) {
      this.finalizeSuccess(message, '/loans');
      return;
    }

    this.loanService.getLoanById(loanId).subscribe({
      next: (loan) => {
        this.patchLoanFormFromLoan(loan as any);
        this.loadAvailablePerParts();
        if (this.equipamentId) {
          this.equipamentService.findById(this.equipamentId).subscribe({
            next: (res) => {
              this.equipamento = res;
              this.snackBar.open(message, 'Sucesso', { duration: 4000 });
              this.router.navigate(['/loans']);
            },
            error: () => {
              this.snackBar.open(message, 'Sucesso', { duration: 4000 });
              this.router.navigate(['/loans']);
            }
          });
        } else {
          this.snackBar.open(message, 'Sucesso', { duration: 4000 });
          this.router.navigate(['/loans']);
        }
      },
      error: () => this.finalizeSuccess(message, '/loans')
    });
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

  copiarDadosEquipamento(): void {
    if (!this.equipamento) return;

    const nome = this.equipamento.name ?? '';
    const codigo = this.equipmentCodeLabel;
    const caracteristicas = this.equipamento.description ?? '';

    const acessoriosTexto = (this.addedAccessories ?? [])
      .map(a => `${a.name} (${a.quantity}x)`)
      .join(', ');

    const partes = [nome, codigo, caracteristicas, acessoriosTexto].filter(p => !!p);
    const textoFormatado = partes.join(', ');

    navigator.clipboard.writeText(textoFormatado).then(
      () => this.snackBar.open('Dados copiados para a área de transferência!', 'OK', { duration: 3000 }),
      () => this.snackBar.open('Não foi possível copiar os dados.', 'Erro', { duration: 3000 })
    );
  }

  get equipmentCodeLabel(): string {
    const topo = this.equipamento?.topo;
    const codigo = this.equipamento?.codigo;
    const id = this.equipamento?.id;
    return (topo ?? codigo ?? id ?? '-') as string;
  }
}