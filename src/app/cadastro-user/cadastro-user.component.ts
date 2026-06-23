import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { Router, ActivatedRoute } from "@angular/router";

import { MatToolbarModule } from "@angular/material/toolbar";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatDividerModule } from "@angular/material/divider";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar";

import { UserService } from "../services/user/user.service";
import { UserRequest } from "../models/users/UserRequest";
import { UserResponse } from "../models/users/UserResponse";
import { LayoutService } from "../services/layout/layout.service";
import { ToolbarUserActionsComponent } from "../shared/toolbar-user-actions/toolbar-user-actions.component";
import { ToolbarLogoComponent } from '../shared/toolbar-logo/toolbar-logo.component';
import { AutocompleteCreateComponent } from "../shared/components/autocomplete-create/autocomplete-create.component";
import { extractApiErrorMessage } from "../core/http/api-error.util";

@Component({
  selector: 'app-cadastro-user',
  standalone: true,
  imports: [
    ReactiveFormsModule, CommonModule, MatToolbarModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatTooltipModule, MatSnackBarModule,
    ToolbarUserActionsComponent, AutocompleteCreateComponent,
    ToolbarLogoComponent,
  ],
  templateUrl: './cadastro-user.component.html',
  styleUrls: ['./cadastro-user.component.css']
})
export class CadastroUserComponent implements OnInit {
  userForm: FormGroup;
  isEdicao = false;
  isVisualizacao = false;
  userId: string | null = null;
  profileOptions: { id: string; name: string }[] = [];
  isLoadingProfiles = true;
  archivedProfileId: string | null = null;
  archivedProfileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required]],
      password: ['', []],
      profileId: [null as string | null, [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');

    this.route.queryParams.subscribe(params => {
      this.isVisualizacao = params['mode'] === 'view' || this.router.url.includes('visualizar');

      if (this.userId) {
        this.isEdicao = !this.isVisualizacao;
        this.loadProfileOptions(() => this.carregarDados(this.userId!));
      } else {
        this.isEdicao = false;
        this.loadProfileOptions();
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      }
    });
  }

  private loadProfileOptions(onLoaded?: () => void): void {
    this.isLoadingProfiles = true;
    this.userService.listProfiles().subscribe({
      next: (profiles) => {
        this.profileOptions = (profiles ?? []).map((p) => ({ id: p.id, name: p.name }));
        this.isLoadingProfiles = false;
        onLoaded?.();
      },
      error: (err) => {
        this.isLoadingProfiles = false;
        this.snackBar.open(
          extractApiErrorMessage(err, 'Não foi possível carregar os perfis de acesso.'),
          'Fechar',
          { duration: 5000 }
        );
      }
    });
  }

  carregarDados(id: string): void {
    this.userService.findById(id).subscribe({
      next: (user: UserResponse) => {
        this.applyUserData(user);
      },
      error: () => {
        this.snackBar.open('Erro ao carregar dados do usuário.', 'Fechar', { duration: 5000 });
      }
    });
  }

  private applyUserData(user: UserResponse): void {
    const profileId = user.profileId ?? null;
    const profileInList = profileId
      ? this.profileOptions.some((p) => p.id === profileId)
      : false;

    if (profileId && !profileInList) {
      this.archivedProfileId = profileId;
      this.archivedProfileName = user.profileName ?? 'Perfil arquivado';
      this.userForm.patchValue({ profileId: null });
      this.userForm.get('profileId')?.clearValidators();
    } else {
      this.archivedProfileId = null;
      this.archivedProfileName = null;
      this.userForm.patchValue({ profileId: profileId });
      if (!this.isVisualizacao) {
        this.userForm.get('profileId')?.setValidators([Validators.required]);
      }
    }
    this.userForm.get('profileId')?.updateValueAndValidity();

    this.userForm.patchValue({
      fullName: user.fullName,
      email: user.email,
      username: user.username,
    });

    if (this.isVisualizacao) {
      this.userForm.disable();
    }

    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  get showArchivedProfile(): boolean {
    return !!this.archivedProfileName && (this.isEdicao || this.isVisualizacao);
  }

  salvar(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    const raw = this.userForm.getRawValue();
    const selectedProfileId = String(raw.profileId ?? '').trim();
    const dados: UserRequest = {
      fullName: String(raw.fullName ?? '').trim(),
      email: String(raw.email ?? '').trim(),
      username: String(raw.username ?? '').trim(),
      profileId: selectedProfileId || this.archivedProfileId || undefined,
    };

    if (!this.isEdicao && raw.password) {
      dados.password = String(raw.password);
    }

    const request = (this.isEdicao && this.userId)
      ? this.userService.update(this.userId, dados)
      : this.userService.create(dados);

    request.subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err) => {
        this.snackBar.open(
          extractApiErrorMessage(err, 'Erro ao salvar usuário.'),
          'Fechar',
          { duration: 5000 }
        );
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/users']);
  }
}
