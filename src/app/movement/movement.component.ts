import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { EquipamentService } from '../services/equipament/equipment.service';
import { MovementService } from '../services/movement/movement.service';
import { PhotoGaleryDialogComponent } from '../photo-galery-dialog/photo-galery-dialog.component';
import { MovementRequest, MovementResponse, MovementType } from '../models/movement/movement.model';

@Component({
  selector: 'app-movement',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatDividerModule, MatMenuModule, MatToolbarModule,
    MatTooltipModule, MatDialogModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatSnackBarModule
  ],
  templateUrl: './movement.component.html',
  styleUrls: ['./movement.component.css']
})
export class MovementComponent implements OnInit {
  equipamentId!: string;
  equipamento: any;
  historico: any[] = [];
  movementForm!: FormGroup;
  movementTypes: string[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  isViewMode = false;
  viewedMovement: MovementResponse | null = null;

  displayedColumns: string[] = ['dataHora', 'movementType', 'responsavel', 'projeto', 'local', 'observacao', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private equipamentService: EquipamentService,
    private movementService: MovementService,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    const equipmentId = this.route.snapshot.paramMap.get('id');
    const movementId = this.route.snapshot.paramMap.get('movementId');
    this.isViewMode = !!movementId || this.route.snapshot.queryParamMap.get('mode') === 'view';

    if (movementId) {
      this.loadMovementDetails(movementId);
    } else if (equipmentId) {
      this.equipamentId = equipmentId;
      this.carregarDados();
    }

    this.movementForm.get('movementType')?.valueChanges.subscribe(value => {
      const justificationControl = this.movementForm.get('justification');
      const obsControl = this.movementForm.get('observacao');

      if (value === MovementType.DESCARTE) {
        justificationControl?.setValidators([Validators.required]);
        obsControl?.setValidators([Validators.required]);
      } else {
        justificationControl?.clearValidators();
        obsControl?.clearValidators();
      }
      justificationControl?.updateValueAndValidity();
      obsControl?.updateValueAndValidity();
    });
  }

  private initForm(): void {
    this.movementForm = this.fb.group({
      movementType: ['', Validators.required],
      justification: [''],
      responsavel: ['', Validators.required],
      projeto: ['', Validators.required],
      local: ['', Validators.required],
      observacao: ['']
    });
  }

  private loadMovementDetails(movementId: string): void {
    this.movementService.findById(movementId).subscribe({
      next: (movement) => {
        this.viewedMovement = movement;
        this.equipamentId = movement.equipamentId;
        this.movementForm.patchValue(movement);
        this.movementForm.disable();
        this.carregarDados();
      }
    });
  }

  carregarDados(): void {
    this.equipamentService.findById(this.equipamentId).subscribe({
      next: (res) => {
        this.equipamento = res;
        if (!this.isViewMode) {
          this.configurarOpcoesMovimentacao(this.equipamento?.statusName || '');
        }
      }
    });

    this.movementService.findHistoryByEquipament(this.equipamentId, 0, 10).subscribe({
      next: (res: any) => this.historico = res.content || res
    });
  }

  configurarOpcoesMovimentacao(status: string): void {
    const s = status.trim().toLowerCase();
    if (s === 'em manutenção' || s === 'em manutencao') {
      this.movementTypes = [MovementType.ENTRADA, MovementType.DESCARTE];
    } else if (s === 'disponível' || s === 'disponivel') {
      this.movementTypes = [MovementType.SAIDA, MovementType.MANUTENCAO, MovementType.DESCARTE];
    } else if (s === 'em uso') {
      this.movementTypes = [MovementType.ENTRADA, MovementType.MANUTENCAO];
    } else {
      this.movementTypes = Object.values(MovementType);
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      const novosArquivos = Array.from(files);
      this.selectedFiles = [...this.selectedFiles, ...novosArquivos];
      novosArquivos.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (e: any) => this.previsualizacoes.push(e.target.result);
        reader.readAsDataURL(file);
      });
    }
    event.target.value = '';
  }

  removerArquivo(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previsualizacoes.splice(index, 1);
  }

  onSubmit(): void {
    if (this.movementForm.invalid) return;

    const dados: MovementRequest = {
      equipamentId: this.equipamentId,
      ...this.movementForm.getRawValue()
    };

    this.movementService.save(dados).subscribe({
      next: (response) => {
        // Se houver arquivos, faz o upload. Se não, apenas finaliza.
        if (this.selectedFiles.length > 0) {
          this.movementService.uploadImages(response.id, this.selectedFiles).subscribe({
            next: () => this.finalizarSalvamento()
          });
        } else {
          this.finalizarSalvamento();
        }
      }
    });
  }

  private finalizarSalvamento(): void {
    this.snackBar.open('Movimentação registrada com sucesso!', 'Sucesso', { duration: 3000 });
    this.resetForm();
    this.carregarDados();
  }

  private resetForm(): void {
    this.selectedFiles = [];
    this.previsualizacoes = [];
    this.movementForm.reset();
    if (this.equipamento) this.configurarOpcoesMovimentacao(this.equipamento.statusName || '');
  }

  verFotos(e: any): void {
    this.dialog.open(PhotoGaleryDialogComponent, {
      width: '850px',
      data: { urls: e.imageUrls }
    });
  }

  voltar(): void {
    this.router.navigate(['/equipaments']);
  }

  formatarData(data: string | null | undefined): string {
    if (!data) return '-';
    try {
      const dataObj = new Date(data);
      if (isNaN(dataObj.getTime())) {
        return data;
      }
      const dia = String(dataObj.getDate()).padStart(2, '0');
      const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
      const ano = dataObj.getFullYear();
      return `${dia}/${mes}/${ano}`;
    } catch {
      return data;
    }
  }
}