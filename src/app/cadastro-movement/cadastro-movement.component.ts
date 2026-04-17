import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';

import { MovementService } from '../services/movement/movement.service';
import { EquipamentService } from '../services/equipament/equipment.service';
import { MovementRequest, MovementType } from '../../app/models/movement/movement.model';

@Component({
  selector: 'app-cadastro-movement',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  templateUrl: './cadastro-movement.component.html',
  styleUrls: ['./cadastro-movement.component.css']
})
export class CadastroMovementComponent implements OnInit {

  movementForm!: FormGroup;
  equipamentId: string | null = null;
  movementTypes: string[] = [];
  selectedFiles: File[] = [];
  isViewMode: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private movementService: MovementService,
    private equipamentService: EquipamentService,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.isViewMode = mode === 'view';

    if (id) {
      if (this.isViewMode) {
        this.carregarDadosMovimentacao(id);
      } else {
        this.equipamentId = id;
        this.carregarDadosEquipamento(id);
      }
    } else {
      this.snackBar.open('Identificador não encontrado.', 'Erro', { duration: 3000 });
      this.router.navigate(['/equipaments']);
    }
  }

  carregarDadosMovimentacao(id: string) {
    this.movementService.findById(id).subscribe({
      next: (mov) => {
        this.movementForm.patchValue(mov);
        this.movementForm.disable();
        this.movementTypes = [mov.movementType];
      },
      error: () => {
        this.snackBar.open('Erro ao carregar dados da movimentação.', 'Erro', { duration: 3000 });
      }
    });
  }

  carregarDadosEquipamento(id: string) {
    this.equipamentService.findById(id).subscribe({
      next: (equip) => {
        this.configurarOpcoesMovimentacao(equip.statusName);
      },
      error: () => {
        this.snackBar.open('Erro ao carregar dados do equipamento.', 'Erro', { duration: 3000 });
      }
    });
  }

  configurarOpcoesMovimentacao(status: string) {
    const s = status.toLowerCase();

    if (s === 'em manutenção') {
      this.movementTypes = [MovementType.ENTRADA, MovementType.DESCARTE];
    }
    else if (s === 'disponível') {
      this.movementTypes = [MovementType.ENTRADA, MovementType.MANUTENCAO, MovementType.DESCARTE];
    }
    else if (s === 'em uso') {
      this.movementTypes = [MovementType.ENTRADA];
      this.movementForm.get('movementType')?.setValue(MovementType.ENTRADA);
      this.movementForm.get('movementType')?.disable();
    }
    else {
      this.movementTypes = Object.values(MovementType);
    }
  }

  initForm() {
    this.movementForm = this.fb.group({
      movementType: ['', Validators.required],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      local: ['', Validators.required],
      observacao: ['']
    });
  }

  onSubmit() {
    if (this.isViewMode) return;

    if (this.selectedFiles.length === 0) {
      this.snackBar.open('É obrigatório anexar pelo menos uma imagem para registrar a movimentação.', 'Aviso', { duration: 4000 });
      return;
    }

    if (this.movementForm.valid && this.equipamentId) {
      const dados: MovementRequest = {
        ...this.movementForm.getRawValue(),
        equipamentId: this.equipamentId
      };

      this.movementService.save(dados).subscribe({
        next: (response) => {
          this.movementService.uploadImages(response.id, this.selectedFiles).subscribe({
            next: () => {
              this.snackBar.open('Movimentação e imagens registradas com sucesso!', 'Sucesso', { duration: 3000 });
              this.voltar();
            },
            error: (err) => {
              console.error('Erro no upload:', err);
              this.snackBar.open('Movimentação salva, mas houve um erro ao processar as imagens.', 'Aviso', { duration: 5000 });
              this.voltar();
            }
          });
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao salvar os dados da movimentação.', 'Fechar', { duration: 3000 });
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  voltar() {
    window.history.back();
  }
}