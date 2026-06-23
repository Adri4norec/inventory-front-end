import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, filter } from 'rxjs';

// Angular Material Imports
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Imports para o Filtro de Data
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Componentes e Serviços
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { EquipmentResponse } from '../models/equipaments/equipament.model';
import { EquipmentSearchFilters } from '../models/equipaments/equipment-search.filters';
import { formatApiViolations, normalizeApiErrorDetails } from '../core/http/api-error.util';
import { EquipamentService } from '../services/equipament/equipment.service';
import { CategoryService } from '../services/equipament/category.service';
import { LoanRefreshService } from '../services/loan/loan-refresh.service';
import { AuthService } from '../services/auth/auth.service';
import { PermissionService } from '../services/auth/permission.service';
import { LayoutService } from '../services/layout/layout.service';
import { STATUS_TYPE_LABEL, StatusType, normalizeStatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';

const STATUS_OPTIONS = [
  { value: 'DISPONIVEL', label: 'Disponível' },
  { value: 'EM_USO', label: 'Em uso' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'INDISPONIVEL', label: 'Indisponível' },
  { value: 'EM_PREPARACAO', label: 'Em preparação' },
  //{ value: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
  { value: 'EM_DEVOLUCAO', label: 'Em devolução' }
];

@Component({
  selector: 'app-equipament',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatChipsModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './equipament.component.html',
  styleUrls: ['./equipament.component.css']
})
export class EquipamentComponent implements OnInit, OnDestroy {

  equipamentos: EquipmentResponse[] = [];
  isLoading = true;
  isFilterCollapsed = false;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isColaborador = false;
  canEditInventory = false;
  canEditLoans = false;

  filtros: EquipmentSearchFilters = {
    nome: '',
    categorias: [],
    tombo: '',
    caracteristicas: '',
    dataInicio: null,
    dataFim: null,
    statuses: [],
  };

  categoriaFilterOptions: { value: string; label: string }[] = [];
  statusFilterOptions = STATUS_OPTIONS;

  displayedColumns: string[] = [
    'name',
    'categoria',
    'description',
    'tombo', 
    'statusName',
    'dateHour',
    'dueDate',
    'usageType',
    'proprietaryName',
    'actions'
  ];

  constructor(
    private equipmentService: EquipamentService,
    private categoryService: CategoryService,
    private authService: AuthService,
    private permissionService: PermissionService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private loanRefreshService: LoanRefreshService,
    public layout: LayoutService
  ) { }

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.authService.resolveUserRole();
    this.permissionService.ensureLoaded().subscribe(() => this.refreshPermissions());
    this.carregarCategorias();
    this.carregarDados();

    this.subs.add(
      this.permissionService.permissions$.subscribe(() => this.refreshPermissions())
    );

    this.subs.add(
      this.route.queryParamMap.subscribe((params) => {
        if (params.get('accessDenied') === '1') {
          this.snackBar.open('Acesso negado. Você não tem permissão para esta página.', 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { accessDenied: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }
      })
    );

    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter((e) => (e.urlAfterRedirects || e.url).startsWith('/equipaments'))
      ).subscribe(() => this.carregarDados(this.pageIndex, this.pageSize))
    );

    this.subs.add(
      this.equipmentService.onEquipmentPhotosRefresh$.subscribe(() => {
        this.carregarDados(this.pageIndex, this.pageSize);
      })
    );

  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private carregarCategorias(): void {
    this.categoryService.listAll().subscribe({
      next: (categories) => {
        this.categoriaFilterOptions = categories.map((category) => ({
          value: category.name,
          label: category.name,
        }));
      },
      error: (err) => {
        console.error('Erro ao carregar categorias', err);
        this.categoriaFilterOptions = [];
      },
    });
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  limparFiltros(): void {
    this.filtros = {
      nome: '',
      categorias: [],
      tombo: '',
      caracteristicas: '',
      dataInicio: null,
      dataFim: null,
      statuses: []
    };
    this.aplicarFiltros();
  }

  toggleFilterPanel(): void {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  getCategoriaSelectLabel(): string {
    const categorias = this.filtros.categorias ?? [];
    if (!categorias.length) {
      return '';
    }
    return categorias
      .map((value) => this.categoriaFilterOptions.find((opt) => opt.value === value)?.label ?? value)
      .join(', ');
  }

  getStatusSelectLabel(): string {
    const statuses = this.filtros.statuses ?? [];
    if (!statuses.length) {
      return '';
    }
    return statuses
      .map((value) => this.statusFilterOptions.find((opt) => opt.value === value)?.label ?? value)
      .join(', ');
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;

    this.equipmentService.advancedSearch(this.filtros, page, size).subscribe({
      next: (response: any) => this.processarResposta(response),
      error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
    });
  }

  private processarResposta(response: any): void {
    this.equipamentos = response.content || [];
    this.totalElements = response.totalElements;
    this.pageIndex = response.number;
    this.isLoading = false;
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.isLoading = false;
    this.exibirErroDoBackend(err, mensagem);
  }

  private exibirErroDoBackend(err: unknown, fallback: string): void {
    const details = normalizeApiErrorDetails(err);
    const message = details.message || fallback;
    const code = details.code ? ` (${details.code})` : '';
    const violations = formatApiViolations(details.violations);
    const finalMessage = violations ? `${message}${code} — ${violations}` : `${message}${code}`;
    this.snackBar.open(finalMessage, 'Fechar', { duration: 6000, panelClass: ['error-snackbar'] });
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }

  getStatusLabel(status: string): string {
    const key = status as StatusType;
    return STATUS_TYPE_LABEL[key] ?? status ?? 'Sem Status';
  }

  getStatusClass(status: string): string {
    return statusColorClass(status);
  }

  podeMovimentar(status: unknown): boolean {
    return true;
  }

  podeExcluir(status: unknown): boolean {
    return normalizeStatusType(status) === StatusType.DISPONIVEL;
  }

  editarEquipamento(equipamento: EquipmentResponse): void {
    this.router.navigate(['/cadastro', equipamento.id]);
  }

  excluirEquipamento(equipamento: EquipmentResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        message: `Excluir o equipamento "${equipamento.name}"?`
      },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      this.isLoading = true;
      this.equipmentService.deleteEquipment(equipamento.id).subscribe({
        next: () => {
          this.snackBar.open('Equipamento excluído com sucesso.', 'OK', { duration: 3000 });
          this.loanRefreshService.notifyRefresh();
          this.carregarDados(this.pageIndex, this.pageSize);
        },
        error: (err) => {
          this.isLoading = false;
          this.exibirErroDoBackend(err, 'Erro ao excluir equipamento.');
        }
      });
    });
  }

  visualizar(e: EquipmentResponse): void {
    this.router.navigate(['/cadastro', e.id], {
      queryParams: {
        mode: 'view',
        showPhotos: true
      }
    });
  }

  verFotos(equipamento: EquipmentResponse): void {
    const urls = equipamento.imageUrls ?? [];
    if (!urls.length) return;

    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      maxWidth: '90vw',
      data: { urls }
    });
  }

  irParaMovimentacao(id: string): void {
    this.router.navigate(['/equipaments', id, 'movimentacao']);
  }

  iniciarEmprestimo(equipamento: EquipmentResponse): void {
    this.router.navigate(['/equipaments', equipamento.id, 'preparation-loan']);
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

  capitalize(text: string | null | undefined): string {
    if (!text) return '-';
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  private refreshPermissions(): void {
    this.canEditInventory = this.permissionService.canEdit('inventory');
    this.canEditLoans = this.permissionService.canEdit('loans');
    this.isColaborador = !this.canEditInventory;
  }
}