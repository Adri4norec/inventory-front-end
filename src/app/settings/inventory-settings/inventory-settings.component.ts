import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LayoutService } from '../../services/layout/layout.service';
import { CategoryService } from '../../services/equipament/category.service';
import { ProprietaryService } from '../../services/equipament/proprietary.service';
import { ProjectService } from '../../services/equipament/project.service';
import { CategoryResponse } from '../../models/equipaments/equipament.model';
import { ProprietaryResponse } from '../../models/proprietaries/proprietary';
import { ProjectResponse } from '../../models/projects/project';
import { extractApiErrorMessage } from '../../core/http/api-error.util';
import { ToolbarUserActionsComponent } from '../../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../../shared/toolbar-logo/toolbar-logo.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  InventoryRecordDialogComponent,
  InventoryRecordDialogData,
  InventoryRecordDialogResult,
  InventoryRecordType,
} from './inventory-record-dialog.component';

type InventoryTab = 'categories' | 'proprietaries' | 'projects';

interface InventoryTableRow {
  id: string;
  name: string;
  type: InventoryRecordType;
}

@Component({
  selector: 'app-inventory-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './inventory-settings.component.html',
  styleUrls: ['./inventory-settings.component.css'],
})
export class InventorySettingsComponent implements OnInit {
  readonly displayedColumns = ['name', 'actions'];

  activeTab: InventoryTab = 'categories';
  categories: CategoryResponse[] = [];
  proprietaries: ProprietaryResponse[] = [];
  projects: ProjectResponse[] = [];
  visibleRows: InventoryTableRow[] = [];

  loading = true;
  pageIndex = 0;
  pageSize = 10;

  constructor(
    public layout: LayoutService,
    private categoryService: CategoryService,
    private proprietaryService: ProprietaryService,
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get totalElements(): number {
    if (this.activeTab === 'categories') return this.categories.length;
    if (this.activeTab === 'proprietaries') return this.proprietaries.length;
    return this.projects.length;
  }

  onTabChange(index: number): void {
    this.activeTab = index === 0 ? 'categories' : index === 1 ? 'proprietaries' : 'projects';
    this.pageIndex = 0;
    this.refreshVisibleRows();
  }

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.refreshVisibleRows();
  }

  openCreateDialog(): void {
    const defaultType: InventoryRecordType =
      this.activeTab === 'categories'
        ? 'category'
        : this.activeTab === 'proprietaries'
          ? 'proprietary'
          : 'project';

    const ref = this.dialog.open(InventoryRecordDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      autoFocus: true,
      panelClass: 'inventory-record-dialog-panel',
      data: {
        mode: 'create',
        defaultType,
        existingNames: this.getExistingNames(defaultType),
      } satisfies InventoryRecordDialogData,
    });

    ref.afterClosed().subscribe((result?: InventoryRecordDialogResult) => {
      if (!result) return;
      this.persistCreate(result);
    });
  }

  openEditDialog(row: InventoryTableRow): void {
    const ref = this.dialog.open(InventoryRecordDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      autoFocus: true,
      panelClass: 'inventory-record-dialog-panel',
      data: {
        mode: 'edit',
        type: row.type,
        name: row.name,
        existingNames: this.getExistingNames(row.type),
      } satisfies InventoryRecordDialogData,
    });

    ref.afterClosed().subscribe((result?: InventoryRecordDialogResult) => {
      if (!result) return;
      this.persistUpdate(row, result.name);
    });
  }

  deleteRecord(row: InventoryTableRow): void {
    const label =
      row.type === 'category' ? 'categoria' : row.type === 'proprietary' ? 'proprietário' : 'projeto';
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Excluir o(a) ${label} "${row.name}"?`,
        detail: 'Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir',
        confirmColor: 'warn',
        icon: 'delete_outline',
      } satisfies ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed?: boolean) => {
      if (!confirmed) return;

      const request =
        row.type === 'category'
          ? this.categoryService.delete(row.id)
          : row.type === 'proprietary'
            ? this.proprietaryService.delete(row.id)
            : this.projectService.delete(row.id);

      request.subscribe({
        next: () => {
          this.removeLocalRecord(row);
          this.snackBar.open('Registro excluído com sucesso.', 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            extractApiErrorMessage(err, 'Não foi possível excluir o registro.'),
            'Fechar',
            { duration: 5000 }
          );
        },
      });
    });
  }

  trackRow(_index: number, row: InventoryTableRow): string {
    return `${row.type}-${row.id}`;
  }

  private loadAll(): void {
    this.loading = true;

    forkJoin({
      categories: this.categoryService.listAll().pipe(catchError(() => of([] as CategoryResponse[]))),
      proprietaries: this.proprietaryService.listAll().pipe(catchError(() => of([] as ProprietaryResponse[]))),
      projects: this.projectService.listAll().pipe(catchError(() => of([] as ProjectResponse[]))),
    }).subscribe({
      next: ({ categories, proprietaries, projects }) => {
        this.categories = categories ?? [];
        this.proprietaries = proprietaries ?? [];
        this.projects = projects ?? [];
        this.loading = false;
        this.refreshVisibleRows();
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(
          extractApiErrorMessage(err, 'Não foi possível carregar os registros.'),
          'Fechar',
          { duration: 5000 }
        );
      },
    });
  }

  private persistCreate(result: InventoryRecordDialogResult): void {
    const payload = { name: result.name };
    const request =
      result.type === 'category'
        ? this.categoryService.create(payload)
        : result.type === 'proprietary'
          ? this.proprietaryService.create(payload)
          : this.projectService.create(payload);

    request.subscribe({
      next: (created) => {
        if (result.type === 'category') {
          this.categories = this.sortByName([...this.categories, created as CategoryResponse]);
          this.activeTab = 'categories';
        } else if (result.type === 'proprietary') {
          this.proprietaries = this.sortByName([...this.proprietaries, created as ProprietaryResponse]);
          this.activeTab = 'proprietaries';
        } else {
          this.projects = this.sortByName([...this.projects, created as ProjectResponse]);
          this.activeTab = 'projects';
        }
        this.pageIndex = 0;
        this.refreshVisibleRows();
        this.snackBar.open('Registro criado com sucesso.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(
          extractApiErrorMessage(err, 'Não foi possível criar o registro.'),
          'Fechar',
          { duration: 5000 }
        );
      },
    });
  }

  private persistUpdate(row: InventoryTableRow, name: string): void {
    const payload = { name };
    const request =
      row.type === 'category'
        ? this.categoryService.update(row.id, payload)
        : row.type === 'proprietary'
          ? this.proprietaryService.update(row.id, payload)
          : this.projectService.update(row.id, payload);

    request.subscribe({
      next: (updated) => {
        if (row.type === 'category') {
          this.categories = this.sortByName(
            this.categories.map((item) => (item.id === row.id ? (updated as CategoryResponse) : item))
          );
        } else if (row.type === 'proprietary') {
          this.proprietaries = this.sortByName(
            this.proprietaries.map((item) => (item.id === row.id ? (updated as ProprietaryResponse) : item))
          );
        } else {
          this.projects = this.sortByName(
            this.projects.map((item) => (item.id === row.id ? (updated as ProjectResponse) : item))
          );
        }
        this.refreshVisibleRows();
        this.snackBar.open('Registro atualizado com sucesso.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(
          extractApiErrorMessage(err, 'Não foi possível atualizar o registro.'),
          'Fechar',
          { duration: 5000 }
        );
      },
    });
  }

  private removeLocalRecord(row: InventoryTableRow): void {
    if (row.type === 'category') {
      this.categories = this.categories.filter((item) => item.id !== row.id);
    } else if (row.type === 'proprietary') {
      this.proprietaries = this.proprietaries.filter((item) => item.id !== row.id);
    } else {
      this.projects = this.projects.filter((item) => item.id !== row.id);
    }
    this.refreshVisibleRows();
  }

  private refreshVisibleRows(): void {
    const source =
      this.activeTab === 'categories'
        ? this.categories.map((item) => ({ id: item.id, name: item.name, type: 'category' as const }))
        : this.activeTab === 'proprietaries'
          ? this.proprietaries.map((item) => ({ id: item.id, name: item.name, type: 'proprietary' as const }))
          : this.projects.map((item) => ({ id: item.id, name: item.name, type: 'project' as const }));

    const start = this.pageIndex * this.pageSize;
    this.visibleRows = source.slice(start, start + this.pageSize);
  }

  private getExistingNames(type: InventoryRecordType): string[] {
    const source =
      type === 'category'
        ? this.categories
        : type === 'proprietary'
          ? this.proprietaries
          : this.projects;
    return source.map((item) => item.name);
  }

  private sortByName<T extends { name: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  }
}
