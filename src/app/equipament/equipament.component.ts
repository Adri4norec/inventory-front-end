import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

// Angular Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule, MatDivider } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

// Componentes e Serviços
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { ConfirmDialogComponent } from './confirm_dialog/confirm-dialog.component';
import { EquipmentResponse } from '../models/equipaments/equipament.model';
import { EquipamentService } from '../services/equipament/equipment.service';
import { ProprietaryService } from '../services/equipament/proprietary.service';

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
    MatDivider,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    ConfirmDialogComponent
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

  apenasDisponiveis = false;
  proprietaries: any[] = [];
  proprietarioSelecionadoId: string | null = null;

  displayedColumns: string[] = [
    'name',
    'description',
    'topo',
    'statusName',
    'dateHour',
    'usageType',
    'proprietaryName',
    'perParts',
    'actions'
  ];

  constructor(
    private equipmentService: EquipamentService,
    private proprietaryService: ProprietaryService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarProprietarios();
    this.carregarDados();
  }

  carregarProprietarios(): void {
    this.proprietaryService.listAll().subscribe({
      next: (data) => {
        this.proprietaries = data;
      },
      error: (err) => console.error('Erro ao buscar proprietários', err)
    });
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.equipmentService.list(page, size, this.apenasDisponiveis, this.proprietarioSelecionadoId).subscribe({
      next: (response) => {
        this.equipamentos = response.content || [];
        this.totalElements = response.totalElements;
        this.pageIndex = response.number;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar equipamentos:', err);
        this.isLoading = false;
      }
    });
  }

  onFilterChange(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      EM_USO: 'play_circle',
      DISPONIVEL: 'check_circle',
      QUEBRADO: 'cancel',
      EM_MANUTENCAO: 'build_circle',
    };
    return icons[status] ?? 'help';
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
          next: () => {
            this.carregarDados(this.pageIndex, this.pageSize);
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Erro ao excluir:', err);
            alert('Erro ao tentar excluir o equipamento.');
          }
        });
      }
    });
  }

  visualizar(e: EquipmentResponse): void {
    this.router.navigate(['/cadastro', e.id], { queryParams: { mode: 'view' } });
  }

  verFotos(equipamento: any): void {
    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      maxWidth: '90vw',
      data: {
        urls: equipamento.imageUrls
      }
    });
  }

  irParaMovimentacao(id: string): void {
    console.log('Navegando para a movimentação do equipamento:', id);
    this.router.navigate(['/equipaments', id, 'movimentacao']);
  }

  limparProprietario(event: Event): void {
    event.stopPropagation();
    this.proprietarioSelecionadoId = null;
    this.onFilterChange();
  }
}