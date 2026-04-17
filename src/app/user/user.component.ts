import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { UserResponse } from '../models/users/UserResponse';
import { UserService } from '../services/user/user.service';
import { ConfirmDialogComponent } from '../equipament/confirm_dialog/confirm-dialog.component';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressBarModule,
    MatToolbarModule,
    MatChipsModule,
    MatMenuModule,
    MatDividerModule,
    MatDialogModule,
    MatPaginatorModule,
    ConfirmDialogComponent
  ],
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.css']
})
export class UserComponent implements OnInit {
  usuarios: UserResponse[] = [];
  isLoading = true;
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;

  displayedColumns: string[] = [
    'fullName',
    'email',
    'username',
    'roleName',
    'actions'
  ];

  constructor(
    private userService: UserService,
    private dialog: MatDialog,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.carregarDados();
  }

  handlePageEvent(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.carregarDados(this.pageIndex, this.pageSize);
  }

  carregarDados(page = 0, size = this.pageSize): void {
    this.isLoading = true;
    this.userService.listAll(page, size).subscribe({
      next: (response) => {
        this.usuarios = response.content;
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