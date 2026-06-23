import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LayoutService } from '../../services/layout/layout.service';
import { UserService } from '../../services/user/user.service';
import { extractApiErrorMessage } from '../../core/http/api-error.util';
import { ToolbarUserActionsComponent } from '../../shared/toolbar-user-actions/toolbar-user-actions.component';
import { ToolbarLogoComponent } from '../../shared/toolbar-logo/toolbar-logo.component';
import {
  AddProfileDialogComponent,
  AddProfileDialogResult
} from './add-profile-dialog.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import {
  ACCESS_MODULES,
  AccessProfile,
  ModulePermissionLevel,
  PERMISSION_OPTIONS
} from './access-profile.model';
import { toAccessProfile, toProfileApiRequest } from './access-profile.mapper';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    ToolbarUserActionsComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './user-settings.component.html',
  styleUrls: ['./user-settings.component.css']
})
export class UserSettingsComponent implements OnInit {
  readonly modules = ACCESS_MODULES;
  readonly permissionOptions = PERMISSION_OPTIONS;

  profiles: AccessProfile[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    public layout: LayoutService,
    private dialog: MatDialog,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
  }

  adicionarPerfil(): void {
    const ref = this.dialog.open(AddProfileDialogComponent, {
      width: '520px',
      maxWidth: '94vw',
      maxHeight: '90vh',
      autoFocus: true,
      panelClass: 'add-profile-dialog-panel',
      data: {
        existingNames: this.profiles.map((p) => p.name)
      }
    });

    ref.afterClosed().subscribe((result?: AddProfileDialogResult) => {
      if (!result) return;

      const payload = toProfileApiRequest(result.name, result.permissions);
      this.userService.createProfile(payload).subscribe({
        next: (response) => {
          this.profiles = [...this.profiles, toAccessProfile(response, true)];
          this.snackBar.open('Perfil criado com sucesso.', 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(
            extractApiErrorMessage(err, 'Não foi possível criar o perfil.'),
            'Fechar',
            { duration: 5000 }
          );
        }
      });
    });
  }

  toggleExpand(profile: AccessProfile): void {
    profile.expanded = !profile.expanded;
  }

  onPermissionChange(profile: AccessProfile, moduleKey: string, level: ModulePermissionLevel): void {
    if (profile.isAdmin) return;

    const previous = profile.permissions[moduleKey];
    profile.permissions[moduleKey] = level;

    const payload = toProfileApiRequest(profile.name, profile.permissions);
    this.userService.updateProfile(profile.id, payload).subscribe({
      next: (response) => {
        const idx = this.profiles.findIndex((p) => p.id === profile.id);
        if (idx >= 0) {
          this.profiles[idx] = toAccessProfile(response, profile.expanded);
        }
      },
      error: (err) => {
        profile.permissions[moduleKey] = previous;
        this.snackBar.open(
          extractApiErrorMessage(err, 'Não foi possível atualizar as permissões.'),
          'Fechar',
          { duration: 5000 }
        );
      }
    });
  }

  excluirPerfil(profile: AccessProfile, event: Event): void {
    event.stopPropagation();
    if (profile.isAdmin) return;

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        message: `Excluir o perfil "${profile.name}"?`,
        detail: 'Perfis com usuários vinculados serão arquivados; os usuários permanecem visíveis na listagem.'
      } satisfies ConfirmDialogData
    });

    ref.afterClosed().subscribe((confirmed?: boolean) => {
      if (!confirmed) return;

      this.userService.deleteProfile(profile.id).subscribe({
        next: () => {
          this.profiles = this.profiles.filter((p) => p.id !== profile.id);
          this.snackBar.open('Perfil excluído com sucesso.', 'OK', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(this.mapProfileDeleteError(err), 'Fechar', { duration: 6000 });
        }
      });
    });
  }

  trackProfile(_index: number, profile: AccessProfile): string {
    return profile.id;
  }

  trackModule(_index: number, mod: { key: string }): string {
    return mod.key;
  }

  private mapProfileDeleteError(err: unknown): string {
    const body = (err as { error?: { error?: string; reasonCode?: string; message?: string } })?.error;
    if (body?.error === 'PROFILE_DELETION_BLOCKED') {
      if (body.reasonCode === 'FIXED_PROFILE') {
        return 'Perfis fixos do sistema não podem ser excluídos.';
      }
      if (body.reasonCode === 'PROFILE_IN_USE') {
        return 'Não é possível excluir um perfil vinculado a usuários.';
      }
    }
    return extractApiErrorMessage(err, 'Não foi possível excluir o perfil.');
  }

  private loadProfiles(): void {
    this.loading = true;
    this.error = null;

    this.userService.listProfiles().subscribe({
      next: (apiProfiles) => {
        this.profiles = apiProfiles.map((p) => toAccessProfile(p, p.fixed));
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = extractApiErrorMessage(err, 'Não foi possível carregar os perfis.');
      }
    });
  }
}
