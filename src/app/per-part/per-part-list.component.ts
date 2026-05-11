import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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

import { PerPartService } from '../services/per-part/per-part.service';
import { PerPartResponse } from '../models/per-part/per-part.model';
import { LayoutService } from '../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ConfirmDialogComponent } from '../equipament/confirm_dialog/confirm-dialog.component';

@Component({
  selector: 'app-per-part-list',
  standalone: true,
  imports: [
    CommonModule,
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
    ToolbarUserActionsComponent
  ],
  templateUrl: './per-part-list.component.html',
  styleUrls: ['./per-part-list.component.css']
})
export class PerPartListComponent implements OnInit {
  displayedColumns: string[] = ['name', 'responsavel', 'quantity', 'actions'];
  dataSource: PerPartResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

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

  carregar(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;
    this.perPartService.listPaged(page, size).subscribe({
      next: (res) => {
        this.dataSource = res.content ?? [];
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
      error: (err) => {
        this.isLoading = false;
        const msg = this.extractErrorMessage(err, 'Não foi possível carregar os acessórios.');
        this.snackBar.open(msg, 'Fechar', { duration: 5000 });
      }
    });
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregar(this.pageIndex, this.pageSize);
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
        error: (err) => {
          const msg = this.extractErrorMessage(err, 'Erro ao excluir o acessório.');
          this.snackBar.open(msg, 'Fechar', { duration: 5000 });
        }
      });
    });
  }

  private extractErrorMessage(err: unknown, fallback: string): string {
    const e = err as { error?: { message?: string }; message?: string };
    return e?.error?.message || e?.message || fallback;
  }
}
