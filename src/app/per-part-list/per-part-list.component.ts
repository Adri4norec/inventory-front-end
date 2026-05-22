import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { PerPartService } from '../services/per-part/per-part.service';
import {
  PerPartAvailabilityStatus,
  PerPartResponse,
  PerPartSearchFilters
} from '../models/per-part/per-part.model';
import { LayoutService } from '../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-per-part-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    MatMenuModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './per-part-list.component.html',
  styleUrls: ['./per-part-list.component.css']
})
export class PerPartListComponent implements OnInit {
  verItensEmUso = false;
  displayedColumns: string[] = ['name', 'quantity', 'actions'];
  dataSource: PerPartResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  filtros: { nome: string } = { nome: '' };

  constructor(
    private perPartService: PerPartService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.carregar(this.pageIndex, this.pageSize);
  }

  get isEmUsoView(): boolean {
    return this.verItensEmUso;
  }

  onToggleVisao(): void {
    this.updateDisplayedColumns();
    this.pageIndex = 0;
    this.carregar();
  }

  private updateDisplayedColumns(): void {
    this.displayedColumns = this.verItensEmUso
      ? ['name', 'quantity', 'responsavel']
      : ['name', 'quantity', 'actions'];
  }

  private buildSearchFilters(): PerPartSearchFilters {
    return {
      nome: this.filtros.nome,
      status: (this.verItensEmUso ? 'EM_USO' : 'DISPONIVEL') as PerPartAvailabilityStatus
    };
  }

  carregar(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.perPartService.advancedSearch(this.buildSearchFilters(), page, size).subscribe({
      next: (res) => {
        const content = res.content ?? [];
        this.dataSource = content;
        this.totalElements = res.totalElements;
        this.pageIndex = res.number;
        this.pageSize = res.size;
        const maxPage = Math.max(0, Math.ceil(this.totalElements / this.pageSize) - 1);
        if (this.pageIndex > maxPage) {
          this.pageIndex = maxPage;
          this.carregar(this.pageIndex, this.pageSize);
          return;
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.filtros = { nome: '' };
    this.aplicarFiltros();
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregar(this.pageIndex, this.pageSize);
  }

  podeEditarExcluir(row: PerPartResponse): boolean {
    return !this.verItensEmUso && row.responsavel == null;
  }

  formatQuantity(row: PerPartResponse): string {
    if (this.verItensEmUso) {
      return String(row.quantity);
    }
    const total = row.originalTotalQuantity ?? row.quantity;
    return `${row.quantity} / ${total}`;
  }

  editar(row: PerPartResponse): void {
    this.router.navigate(['/inventario/acessorios/editar', row.id]);
  }

  excluir(row: PerPartResponse): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { name: row.name },
      disableClose: true
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.perPartService.delete(row.id).subscribe({
        next: () => {
          this.snackBar.open('Acessório excluído com sucesso.', 'OK', { duration: 3000 });
          this.carregar();
        },
        error: () => { /* mensagem via interceptor */ }
      });
    });
  }
}
