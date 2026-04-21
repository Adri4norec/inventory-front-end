import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
    MatInputModule
  ],
  templateUrl: './equipament.component.html',
  styleUrls: ['./equipament.component.css']
})
export class EquipamentComponent implements OnInit, OnDestroy {
  // Referência para manter o foco no input de pesquisa
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  equipamentos: EquipmentResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  apenasDisponiveis = false;
  termoPesquisa: string = '';

  isColaborador = false;

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  displayedColumns: string[] = [
    'name',
    'description',
    'topo',
    'categoria',
    'statusName',
    'dateHour',
    'usageType',
    'proprietaryName',
    'perParts',
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

    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(term => {
      this.termoPesquisa = term;
      this.onFilterChange();
    });

    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;

    if (this.termoPesquisa && this.termoPesquisa.trim() !== '') {
      this.equipmentService.search(this.termoPesquisa, page, size).subscribe({
        next: (response: any) => this.processarResposta(response),
        error: (err: any) => this.lidarComErro('Erro na pesquisa', err)
      });
    } else {
      this.equipmentService.list(page, size, this.apenasDisponiveis, null).subscribe({
        next: (response: any) => this.processarResposta(response),
        error: (err: any) => this.lidarComErro('Erro ao carregar dados', err)
      });
    }
  }

  private processarResposta(response: any): void {
    this.equipamentos = response.content || [];
    this.totalElements = response.totalElements;
    this.pageIndex = response.number;
    this.isLoading = false;

    // Garante que o cursor permaneça no input após a atualização dos dados
    this.devolverFoco();
  }

  private lidarComErro(mensagem: string, err: any): void {
    console.error(mensagem, err);
    this.isLoading = false;
    this.devolverFoco();
  }

  private devolverFoco(): void {
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.nativeElement.focus();
      }
    }, 0);
  }

  onSearchKeyUp(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject.next(target.value);
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

  limparPesquisa(): void {
    this.termoPesquisa = '';
    this.searchSubject.next('');
    this.devolverFoco();
  }
}