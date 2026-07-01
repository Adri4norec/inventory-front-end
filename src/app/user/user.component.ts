import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { UserResponse } from '../models/users/UserResponse';
import { UserService } from '../services/user/user.service';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import { LayoutService } from '../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    ConfirmDialogComponent,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  usuarios: UserResponse[] = [];
  isLoading = true;
  isFilterCollapsed = false;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  filtros = {
    nome: '',
    email: '',
    usuario: ''
  };

  displayedColumns: string[] = [
    'fullName',
    'email',
    'username',
    'profileName',
    'actions'
  ];

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private router: Router,
    public layout: LayoutService
  ) { }

  ngOnInit(): void {
    this.carregarDados();
  }

  aplicarFiltros(): void {
    this.pageIndex = 0;
    this.carregarDados();
  }

  limparFiltros(): void {
    this.filtros = {
      nome: '',
      email: '',
      usuario: ''
    };
    this.aplicarFiltros();
  }

  toggleFilterPanel(): void {
    this.isFilterCollapsed = !this.isFilterCollapsed;
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }

  carregarDados(page = this.pageIndex, size = this.pageSize): void {
    this.isLoading = true;

    this.userService.advancedSearch(this.filtros, {
      page,
      size,
      sort: 'createdAt,desc',
    }).subscribe({
      next: (response) => {
        this.usuarios = response.content || [];
        this.totalElements = response.totalElements;
        this.pageIndex = response.number;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erro ao carregar:', err);
        this.isLoading = false;
      }
    });
  }

  visualizarUsuario(u: UserResponse): void {
    this.router.navigate(['/users/visualizar', u.id], {
      queryParams: { mode: 'view' }
    });
  }

  editarUsuario(user: UserResponse): void {
    this.router.navigate(['/users/editar', user.id]);
  }

  profileChipClass(profileName?: string | null): string {
    const normalized = (profileName ?? '').trim().toLowerCase();
    if (normalized === 'admin') return 'admin';
    if (normalized === 'colaborador') return 'colaborador';
    return 'pendente';
  }

  excluirUsuario(user: UserResponse): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { name: user.fullName },
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.userService.delete(user.id).subscribe({
          next: () => {
            this.carregarDados(this.pageIndex, this.pageSize);
          },
          error: (err) => {
            console.error('Erro ao excluir usuário:', err);
            this.isLoading = false;
          }
        });
      }
    });
  }
}
