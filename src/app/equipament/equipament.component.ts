import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, RouterModule, Router } from '@angular/router';
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

// Imports para o Filtro de Data
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

// Componentes e Serviços
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { ConfirmDialogComponent } from './confirm_dialog/confirm-dialog.component';
import { EquipmentResponse } from '../models/equipaments/equipament.model';
import { EquipamentService } from '../services/equipament/equipment.service';
import { AuthService } from '../services/auth/auth.service';
import { LayoutService } from '../services/layout/layout.service';
import { STATUS_TYPE_LABEL, STATUS_TYPE_OPTIONS, StatusType, normalizeStatusType, statusColorClass } from '../models/status/status-type';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

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
    ToolbarUserActionsComponent
  ],
  templateUrl: './equipament.component.html',
  styleUrls: ['./equipament.component.css']
})
export class EquipamentComponent implements OnInit, OnDestroy {

  equipamentos: EquipmentResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isColaborador = false;

  filtros = {
    nome: '',
    categoria: '',
    tombo: '',
    caracteristicas: '',
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    status: ''
  };

  statusFilterOptions = STATUS_TYPE_OPTIONS;

  displayedColumns: string[] = [
    'categoria',
    'name',
    'description',
    'tombo', 
    'statusName',
    'dateHour',
    'usageType',
    'proprietaryName',
    'actions'
  ];

  constructor(
    private equipmentService: EquipamentService,
    private authService: AuthService,
    private dialog: MatDialog,
    private router: Router,
    public layout: LayoutService
  ) { }

  private readonly subs = new Subscription();

  ngOnInit(): void {
    this.isColaborador = this.authService.isColaborador();
    this.carregarDados();

    // Garante que, ao voltar para a listagem, reflita qualquer mudança de status feita em outras telas (ex.: empréstimos).
    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        filter((e) => (e.urlAfterRedirects || e.url).startsWith('/equipaments'))
      ).subscribe(() => this.carregarDados(this.pageIndex, this.pageSize))
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  limparFiltros(): void {
    this.filtros = {
      nome: '',
      categoria: '',
      tombo: '',
      caracteristicas: '',
      dataInicio: null,
      dataFim: null,
      status: ''
    };
    this.aplicarFiltros();
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
    const st = normalizeStatusType(status);
    if (!st) return false;
    return [
      StatusType.EM_USO,
      StatusType.EM_MANUTENCAO,
      StatusType.DISPONIVEL
    ].includes(st);
  }

  editarEquipamento(equipamento: EquipmentResponse): void {
    this.router.navigate(['/cadastro', equipamento.id]);
  }

  excluirEquipamento(equipamento: EquipmentResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { name: equipamento.name },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.equipmentService.delete(equipamento.id).subscribe({
          next: () => this.carregarDados(this.pageIndex, this.pageSize),
          error: () => {
            this.isLoading = false;
            alert('Erro ao tentar excluir o equipamento.');
          }
        });
      }
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

  verFotos(equipamento: any): void {
    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      maxWidth: '90vw',
      data: { urls: equipamento.imageUrls }
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
}