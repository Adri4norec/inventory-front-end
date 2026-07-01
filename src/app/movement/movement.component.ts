import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LoanService } from '../services/loan/loan.service';
import { UserService } from '../services/user/user.service';

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
import { ProjectService } from '../services/equipament/project.service';
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { ImageLightboxComponent } from '../shared/components/image-lightbox/image-lightbox.component';
import { AutocompleteCreateComponent } from '../shared/components/autocomplete-create/autocomplete-create.component';
import { MovementRequest, MovementResponse, MovementType } from '../models/movement/movement.model';
import { UserSearchResponse, LoanDetailResponse } from '../models/loans/loans.model';
import { EquipmentResponse } from '../models/equipaments/equipament.model';
import { extractLoanFormDefaults, isMovementLoanPrefillStatus, LoanFormDefaults } from '../core/loan-form.util';
import { resolveMovementErrorMessage } from '../core/movement-error.util';
import { LayoutService } from '../services/layout/layout.service';
import { formatStatusLabel, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';
import { environment } from '../../environments/environment';
import { ProjectResponse } from '../models/projects/project';

@Component({
  selector: 'app-movement',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatDividerModule, MatMenuModule, MatToolbarModule,
    MatTooltipModule, MatDialogModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule, MatAutocompleteModule,
    ToolbarUserActionsComponent, AutocompleteCreateComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './movement.component.html',
  styleUrls: ['./movement.component.css']
})
export class MovementComponent implements OnInit {
  equipamentId!: string;
  equipamento: any;
  historico: any[] = [];
  movementForm!: FormGroup;
  movementTypes: string[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  isViewMode = false;
  viewedMovement: MovementResponse | null = null;
  filteredUsers: UserSearchResponse[] = [];
  projects: ProjectResponse[] = [];
  allProjects: ProjectResponse[] = [];

  private readonly apiBase = environment.apiUrl;
  imagensSalvas: Array<{ id: string; url: string }> = [];
  imagensMantidasIds: string[] = [];
  imagensExcluidasIds: string[] = [];
  private loanDefaultsApplied = false;

  displayedColumns: string[] = ['dataHora', 'movementType', 'responsavel', 'projeto', 'local', 'observacao', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private movementService: MovementService,
    private loanService: LoanService,
    private userService: UserService,
    private projectService: ProjectService,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {
    this.initForm();
  }

  getStatusClass(status: unknown): string {
    return statusColorClass(status);
  }

  formatStatusLabel(raw: unknown): string {
    return formatStatusLabel(raw);
  }

  get isLoanFieldsLocked(): boolean {
    return isMovementLoanPrefillStatus(this.equipamento?.statusName);
  }

  ngOnInit(): void {
    const equipmentId = this.route.snapshot.paramMap.get('id');
    const movementId = this.route.snapshot.paramMap.get('movementId');
    this.isViewMode = !!movementId || this.route.snapshot.queryParamMap.get('mode') === 'view';

    if (movementId) {
      this.loadMovementDetails(movementId);
    } else if (equipmentId) {
      this.equipamentId = equipmentId;
      this.carregarDados();
    }

    this.movementForm.get('movementType')?.valueChanges.subscribe(value => {
      const justificationControl = this.movementForm.get('justification');
      const obsControl = this.movementForm.get('observacao');

      if (value === MovementType.DESCARTE) {
        justificationControl?.setValidators([Validators.required]);
        obsControl?.setValidators([Validators.required]);
      } else {
        justificationControl?.clearValidators();
        obsControl?.clearValidators();
      }
      justificationControl?.updateValueAndValidity();
      obsControl?.updateValueAndValidity();
    });

    this.onSearchResponsavel('');
  }

  private initForm(): void {
    this.movementForm = this.fb.group({
      movementType: ['', Validators.required],
      justification: [''],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      local: ['', Validators.required],
      observacao: ['']
    });
  }

  onSearchResponsavel(term: string): void {
    const search = term?.trim() ?? '';
    if (search.length < 1) {
      this.movementService.searchUsers('').pipe(
        catchError(() => of([]))
      ).subscribe(users => this.filteredUsers = this.normalizeUsers(users));
      return;
    }
    this.movementService.searchUsers(search).pipe(
      catchError(() => of([]))
    ).subscribe(users => this.filteredUsers = this.normalizeUsers(users));
  }

  private normalizeUsers(users: any[]): UserSearchResponse[] {
    return (users ?? []).map((u) => {
      const fullName = String(u?.fullName ?? u?.full_name ?? u?.nome ?? u?.name ?? '').trim();
      const id = String(u?.id ?? '').trim();
      return { id, fullName } as UserSearchResponse;
    }).filter((u) => !!u.fullName);
  }

  private loadMovementDetails(movementId: string): void {
    this.movementService.findById(movementId).subscribe({
      next: (movement) => {
        this.viewedMovement = movement;
        this.equipamentId = movement.equipamentId;
        this.movementForm.patchValue(movement);
        this.movementForm.disable();
        this.carregarDados();
      }
    });
  }

  carregarDados(): void {
    forkJoin({
      equipment: this.equipamentService.findById(this.equipamentId),
      projects: this.projectService.listAll().pipe(catchError(() => of<ProjectResponse[]>([]))),
      history: this.movementService.findHistoryByEquipament(this.equipamentId, 0, 10).pipe(
        catchError(() => of({ content: [] }))
      ),
    }).subscribe({
      next: ({ equipment, projects, history }) => {
        this.allProjects = projects ?? [];
        this.projects = [...this.allProjects];
        this.equipamento = equipment;
        this.historico = (history as { content?: unknown[] }).content || history;

        if (equipment.imageUrls?.length) {
          this.inicializarGaleria(equipment.imageUrls);
        }

        if (!this.isViewMode) {
          this.configurarOpcoesMovimentacao(this.equipamento?.statusName || '');
          this.prefillFromActiveLoan(equipment);
          if (!isMovementLoanPrefillStatus(equipment.statusName)) {
            this.applyLoanFieldsLock();
          }
        }
      }
    });
  }

  private prefillFromActiveLoan(equipment: EquipmentResponse): void {
    if (this.isViewMode || this.loanDefaultsApplied) return;
    if (!isMovementLoanPrefillStatus(equipment.statusName)) return;

    const embedded = extractLoanFormDefaults(equipment.activeLoan);
    this.applyLoanFormDefaults(embedded);

    if (this.movementForm.get('projeto')?.value) {
      this.loanDefaultsApplied = true;
      this.applyLoanFieldsLock();
      return;
    }

    const loanId = String(equipment.activeLoanId ?? equipment.activeLoan?.id ?? '').trim();
    if (!loanId) {
      this.loanDefaultsApplied = true;
      this.applyLoanFieldsLock();
      return;
    }

    this.loanService.getLoanById(loanId).pipe(
      catchError(() => of(null))
    ).subscribe((loan) => {
      if (loan) {
        this.applyLoanProjectFromDetail(loan);
      }
      this.loanDefaultsApplied = true;
      this.applyLoanFieldsLock();
    });
  }

  private applyLoanProjectFromDetail(loan: LoanDetailResponse): void {
    if (this.movementForm.get('projeto')?.value) {
      return;
    }

    const projectId = this.resolveProjectIdFromLoan(loan as unknown as Record<string, unknown>);
    if (!projectId) {
      return;
    }

    const known = this.allProjects.find((project) => project.id === projectId);
    if (known) {
      this.patchProjeto(projectId);
      return;
    }

    const loanName = String(loan.projectName ?? '').trim();
    if (loanName) {
      this.ensureProjectOption(projectId, loanName);
      this.patchProjeto(projectId);
      return;
    }

    this.projectService.findById(projectId).pipe(
      catchError(() => of(null))
    ).subscribe((project) => {
      if (!project?.id || this.movementForm.get('projeto')?.value) {
        return;
      }
      this.ensureProjectOption(project.id, project.name);
      this.patchProjeto(project.id);
    });
  }

  private resolveProjectIdFromLoan(loan: Record<string, unknown>): string {
    const directId = String(loan['projectId'] ?? '').trim();
    if (directId) {
      return directId;
    }

    const legacyName = String(
      loan['projectName'] ??
      loan['helpdeskTicket'] ??
      loan['helpdesk_ticket'] ??
      loan['helpDeskTicket'] ??
      loan['projeto'] ??
      ''
    ).trim();

    if (!legacyName) {
      return '';
    }

    const match = this.allProjects.find(
      (project) => project.name.localeCompare(legacyName, 'pt-BR', { sensitivity: 'base' }) === 0
    );
    return match?.id ?? '';
  }

  private patchProjeto(projectId: string): void {
    const control = this.movementForm.get('projeto');
    if (!projectId || control?.value) {
      return;
    }

    const wasDisabled = control?.disabled ?? false;
    if (wasDisabled) {
      control?.enable({ emitEvent: false });
    }
    control?.setValue(projectId, { emitEvent: false });
    if (wasDisabled) {
      control?.disable({ emitEvent: false });
    }
  }

  private ensureProjectOption(projectId: string, name: string): void {
    if (this.allProjects.some((project) => project.id === projectId)) {
      return;
    }
    const project: ProjectResponse = { id: projectId, name, active: true };
    this.allProjects = [...this.allProjects, project].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );
    this.projects = [...this.allProjects];
  }

  onSearchProjeto(term: string): void {
    const trimmed = term?.trim() ?? '';
    this.projects = trimmed
      ? this.allProjects.filter((project) => project.name.toLowerCase().includes(trimmed.toLowerCase()))
      : [...this.allProjects];
  }

  onCreateNewProjeto(term: string): void {
    const name = term?.trim();
    if (!name) {
      this.snackBar.open('Informe o nome do projeto.', 'Fechar', { duration: 5000 });
      return;
    }

    this.projectService.create({ name }).subscribe({
      next: (created) => {
        this.allProjects = [...this.allProjects, created].sort((a, b) =>
          a.name.localeCompare(b.name, 'pt-BR')
        );
        this.projects = [...this.allProjects];
        this.patchProjeto(created.id);
        this.snackBar.open(`Projeto "${created.name}" criado com sucesso.`, 'Fechar', { duration: 4000 });
      },
      error: (err) => {
        const message = (err as { error?: { message?: string } })?.error?.message ?? 'Erro ao criar projeto.';
        this.snackBar.open(message, 'Fechar', { duration: 5000 });
      },
    });
  }

  private resolveProjetoNameForSubmit(rawValue: unknown): string {
    const value = String(rawValue ?? '').trim();
    if (!value) {
      return '';
    }
    const byId = this.allProjects.find((project) => project.id === value);
    return byId?.name ?? value;
  }

  private applyLoanFormDefaults(defaults: LoanFormDefaults): void {
    const patch: { responsavel?: string } = {};

    const projectId = defaults.projectId || this.resolveProjectIdFromLoan({
      projectId: defaults.projectId,
      projectName: defaults.projeto,
      projeto: defaults.projeto,
    } as Record<string, unknown>);

    if (projectId && !this.movementForm.get('projeto')?.value) {
      this.patchProjeto(projectId);
    } else if (defaults.projeto && !this.movementForm.get('projeto')?.value) {
      const match = this.allProjects.find(
        (project) => project.name.localeCompare(defaults.projeto, 'pt-BR', { sensitivity: 'base' }) === 0
      );
      if (match) {
        this.patchProjeto(match.id);
      }
    }

    const needsResponsavel = !this.movementForm.get('responsavel')?.value;
    if (needsResponsavel && defaults.responsavel) {
      patch.responsavel = defaults.responsavel;
      this.ensureUserInOptions(defaults.responsavel, defaults.colaboradorId);
    } else if (needsResponsavel && defaults.colaboradorId) {
      this.userService.findById(defaults.colaboradorId).pipe(
        catchError(() => of(null))
      ).subscribe((user) => {
        const fullName = String(user?.fullName ?? '').trim();
        if (!fullName || this.movementForm.get('responsavel')?.value) {
          return;
        }
        this.ensureUserInOptions(fullName, defaults.colaboradorId);
        this.movementForm.get('responsavel')?.setValue(fullName, { emitEvent: false });
      });
    }

    if (patch.responsavel) {
      this.movementForm.get('responsavel')?.setValue(patch.responsavel, { emitEvent: false });
    }
  }

  private applyLoanFieldsLock(): void {
    const responsavelControl = this.movementForm.get('responsavel');
    const projetoControl = this.movementForm.get('projeto');
    if (!responsavelControl || !projetoControl) return;

    if (this.isLoanFieldsLocked) {
      responsavelControl.disable({ emitEvent: false });
      projetoControl.disable({ emitEvent: false });
      return;
    }

    responsavelControl.enable({ emitEvent: false });
    projetoControl.enable({ emitEvent: false });
  }

  private ensureUserInOptions(fullName: string, id?: string): void {
    const normalizedId = (id ?? '').trim();
    const exists = this.filteredUsers.some(
      (u) => u.fullName === fullName || (!!normalizedId && u.id === normalizedId)
    );
    if (!exists) {
      this.filteredUsers = [{ id: normalizedId, fullName }, ...this.filteredUsers];
    }
  }

  configurarOpcoesMovimentacao(status: string): void {
    const s = (status ?? '').trim().toUpperCase().replace(/\s+/g, '_');
    switch (s) {
      case 'DISPONIVEL':
        this.movementTypes = [MovementType.MANUTENCAO, MovementType.DESCARTE];
        break;
      case 'EM_MANUTENCAO':
        this.movementTypes = [MovementType.ENTRADA, MovementType.DESCARTE];
        break;
      case 'EM_USO':
        this.movementTypes = [MovementType.ENTRADA, MovementType.MANUTENCAO];
        break;
      default:
        this.movementTypes = Object.values(MovementType);
        break;
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

  inicializarGaleria(imagensDaApi: string[]): void {
    this.imagensSalvas = (imagensDaApi ?? []).map(url => {
      const fullUrl = (url.startsWith('http') || url.startsWith('data:'))
        ? url
        : `${this.apiBase}/uploads/${url}`;
      return { id: url, url: fullUrl };
    });
    this.imagensMantidasIds = this.imagensSalvas.map(img => img.id);
    this.imagensExcluidasIds = [];
  }

  removerFotoSalva(id: string): void {
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

  onSubmit(): void {
    if (this.movementForm.invalid) return;

    const dados: MovementRequest = {
      equipamentId: this.equipamentId,
      ...this.movementForm.getRawValue(),
      projeto: this.resolveProjetoNameForSubmit(this.movementForm.getRawValue().projeto),
    };

    const equipmentId = this.equipamentId;
    const keepUrls = [...this.imagensMantidasIds];
    const newFiles = [...this.selectedFiles];
    const hasImageChanges = this.imagensExcluidasIds.length > 0 || newFiles.length > 0;

    this.movementService.save(dados).subscribe({
      next: () => {
        if (hasImageChanges && equipmentId) {
          this.equipamentService.manageImages(equipmentId, keepUrls, newFiles).pipe(
            catchError((err) => {
              console.error('[movement] manageImages ERRO:', err);
              this.snackBar.open('Movimentação salva, mas erro ao atualizar fotos.', 'Atenção', { duration: 4000 });
              return of(null);
            })
          ).subscribe(() => this.finalizarSalvamento());
        } else {
          this.finalizarSalvamento();
        }
      },
      error: (err) => this.showMovementViolation(err)
    });
  }

  private showMovementViolation(err: unknown): void {
    this.snackBar.open(resolveMovementErrorMessage(err), 'Fechar', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }

  private finalizarSalvamento(): void {
    this.snackBar.open('Movimentação registrada com sucesso!', 'Sucesso', { duration: 3000 });
    this.resetForm();
    this.carregarDados();
  }

  private resetForm(): void {
    this.selectedFiles = [];
    this.previsualizacoes = [];
    this.imagensExcluidasIds = [];
    this.loanDefaultsApplied = false;
    this.movementForm.reset();
    if (this.equipamento) {
      this.configurarOpcoesMovimentacao(this.equipamento.statusName || '');
      this.prefillFromActiveLoan(this.equipamento);
      if (!isMovementLoanPrefillStatus(this.equipamento.statusName)) {
        this.applyLoanFieldsLock();
      }
    }
  }

  verFotos(e: any): void {
    const fotosDoHistorico = e.imageUrls || [];

    const urlsCompletas = fotosDoHistorico.map((nomeArquivo: string) => {
      return this.movementService.resolveImageUrl(nomeArquivo);
    });

    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      data: { urls: urlsCompletas }
    });
  }

  voltar(): void {
    this.router.navigate(['/equipaments']);
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
