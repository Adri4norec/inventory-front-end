import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

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
    MatNativeDateModule
  ],
  templateUrl: './equipament.component.html',
  styleUrls: ['./equipament.component.css']
})
export class EquipamentComponent implements OnInit {

  equipamentos: EquipmentResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  isColaborador = false;

  // Objeto centralizador de filtros
  filtros = {
    nome: '',
    categoria: '',
    tombo: '',
    caracteristicas: '',
    dataInicio: null as Date | null,
    dataFim: null as Date | null,
    status: ''
  };

  // Nomes das colunas conforme definido no HTML e mapeados no DTO (uso de 'topo' ao invés de 'tombo')
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
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isColaborador = this.authService.isColaborador();
    // A tabela agora nasce com os dados carregados
    this.carregarDados();
  }

  // Aplica os filtros e volta para a primeira página
  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  // Limpa tudo e busca a tabela no padrão
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

  // Envia o objeto de filtros para o Service
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
    const labels: Record<string, string> = {
      EM_USO: 'Em Uso',
      DISPONIVEL: 'Disponível',
      QUEBRADO: 'Quebrado',
      EM_MANUTENCAO: 'Manutenção',
    };
    return labels[status] ?? status ?? 'Sem Status';
  }

  getAcessoriosOrdenados(equipamento: EquipmentResponse): string {
    if (!equipamento.perParts || equipamento.perParts.length === 0) {
      return '(N/A)';
    }
    return equipamento.perParts
      .map(part => part.name)
      .sort((a, b) => a.localeCompare(b))
      .join(', ');
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
}