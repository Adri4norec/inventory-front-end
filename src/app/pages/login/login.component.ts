import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthService } from '../../services/auth/auth.service';
import { PermissionService } from '../../services/auth/permission.service';
import { AuthType, LoginRequest } from '../../models/auth/LoginRequest';
import { mapLoginError } from './mapLoginError';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';
  hidePassword = true;

  readonly AuthType = {
    LOCAL: 'LOCAL' as AuthType,
    LDAP: 'LDAP' as AuthType,
  };

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      useLdap: [false],
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onLogin(): void {
    if (this.loginForm.invalid) return;

    this.errorMessage = '';
    const { useLdap, username, password } = this.loginForm.getRawValue() as {
      useLdap: boolean;
      username: string;
      password: string;
    };

    const authData: LoginRequest = {
      username: username.trim(),
      password,
      authType: useLdap ? this.AuthType.LDAP : this.AuthType.LOCAL,
    };

    this.authService.login(authData).subscribe({
      next: () => {
        this.permissionService.reload().subscribe({
          next: () => {
            void this.router.navigateByUrl('/inventario');
          },
          error: () => {
            void this.router.navigateByUrl('/inventario');
          }
        });
      },
      error: (err) => {
        console.error('Objeto de erro completo:', err);
        this.errorMessage = mapLoginError(err);
      }
    });
  }
}
