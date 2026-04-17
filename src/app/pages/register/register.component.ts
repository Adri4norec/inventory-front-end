import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UserService } from '../../services/user/user.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  hidePassword = true;
  loading = false;
  errorMessage = '';

  constructor(private fb: FormBuilder, private userService: UserService, private router: Router, ) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required]],
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]], 
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const requestData = {
      ...this.registerForm.value,
      roleName: 'COLABORADOR' 
    };

    console.log('Enviando para o servidor:', requestData);

    this.userService.create(requestData).subscribe({
      next: (response) => {
        console.log('Usuário criado com sucesso:', response);
        this.loading = false;
        this.router.navigate(['/login']); 
      },
      error: (err) => {
        console.error('Erro ao registrar:', err);
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erro ao tentar registrar o usuário. Verifique se o servidor está online.';
      }
    });
  }
}