import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

// Imports do Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';

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
    MatIconModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  hidePassword = true; // Controle para mostrar/esconder senha

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {
    // Inicializando o formulário reativo com validações
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.errorMessage = '';
    const authData = this.loginForm.value;

    this.userService.login(authData).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', response.username);
        localStorage.setItem('userRole', response.roleName);
        this.authService.setUserRole(response.roleName as 'ADMIN' | 'COLABORADOR');
        this.router.navigate(['/equipaments']);
      },
      error: (err) => {
        console.error('Objeto de erro completo:', err);

        const errorBody = err.error;
        const message = typeof errorBody === 'string' ? errorBody : errorBody?.message || '';

        if (message.includes('USER_NOT_FOUND')) {
          this.errorMessage = 'Usuário não cadastrado.';
        } else if (message.includes('INVALID_PASSWORD') || err.status === 401) {
          this.errorMessage = 'Senha ou usuário incorreto.';
        } else if (err.status === 0) {
          this.errorMessage = 'O servidor parece estar desligado ou houve erro de CORS.';
        } else {
          this.errorMessage = 'Erro inesperado: ' + (message || 'Erro de conexão.');
        }
      }
    });
  }
}