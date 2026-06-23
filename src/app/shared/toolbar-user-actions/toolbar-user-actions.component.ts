import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../services/auth/auth.service';
import { PermissionService } from '../../services/auth/permission.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-toolbar-user-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './toolbar-user-actions.component.html',
  styleUrls: ['./toolbar-user-actions.component.css'],
})
export class ToolbarUserActionsComponent {
  constructor(
    public auth: AuthService,
    private permissionService: PermissionService,
    private router: Router,
    private dialog: MatDialog,
  ) {}

  get fullName(): string {
    return this.auth.getFullName() || '';
  }

  logout(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar saída',
        message: 'Deseja realmente sair do sistema?',
        detail: 'Você precisará entrar novamente para continuar.',
        confirmLabel: 'Sair',
        icon: 'logout',
        titleColor: '#2f76c7',
        confirmColor: 'primary',
      } satisfies ConfirmDialogData,
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.permissionService.clear();
      this.auth.logout();
      this.router.navigate(['/login']);
    });
  }
}

