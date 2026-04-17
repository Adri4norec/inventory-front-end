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

import { UserService } from "../services/user/user.service";
import { UserResponse } from "../models/users/UserResponse";

@Component({
  selector: 'app-cadastro-user',
  standalone: true,
  imports: [
    ReactiveFormsModule, CommonModule, MatToolbarModule, MatCardModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatDividerModule, MatTooltipModule
  ],
  templateUrl: './cadastro-user.component.html',
  styleUrls: ['./cadastro-user.component.css']
})
export class CadastroUserComponent implements OnInit {
  userForm: FormGroup;
  isEdicao = false;
  isVisualizacao = false;
  userId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) {
    this.userForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required]],
      password: ['', []],
      roleName: [null]
    });
  }

  perfis = [
    { label: 'Colaborador', value: 'COLABORADOR' },
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Visualizador', value: 'VISUALIZADOR' }
  ];

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');

    this.route.queryParams.subscribe(params => {

      this.isVisualizacao = params['mode'] === 'view' || this.router.url.includes('visualizar');

      if (this.userId) {
        this.isEdicao = !this.isVisualizacao;
        this.carregarDados(this.userId);
      } else {
        this.isEdicao = false;
        this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      }
    });
  }

  carregarDados(id: string): void {
    this.userService.findById(id).subscribe({
      next: (user: UserResponse) => {
        console.log('Usuário carregado:', user);

        this.userForm.patchValue({
          fullName: user.fullName,
          email: user.email,
          username: user.username,
          roleName: user.roleName
        });

        if (this.isVisualizacao) {
          this.userForm.disable();
        }

        this.userForm.get('password')?.clearValidators();
        this.userForm.get('password')?.updateValueAndValidity();
      },
      error: (err) => {
        console.error('Erro ao carregar dados do usuário:', err);
      }
    });
  }

  salvar(): void {
    if (this.userForm.invalid) return;

    const dados = this.userForm.getRawValue();

    const request = (this.isEdicao && this.userId)
      ? this.userService.update(this.userId, dados)
      : this.userService.create(dados);

    request.subscribe({
      next: () => this.router.navigate(['/users']),
      error: (err) => alert('Erro ao salvar usuário')
    });
  }

  cancelar(): void {
    this.router.navigate(['/users']);
  }
}