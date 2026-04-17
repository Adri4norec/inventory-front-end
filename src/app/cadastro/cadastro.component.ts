import { Component, OnInit } from "@angular/core";
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from "@angular/forms";
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
import { MatChipsModule } from "@angular/material/chips";
import { MatListModule } from "@angular/material/list";
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ProprietaryService } from "../services/equipament/proprietary.service";
import { EquipamentService } from "../services/equipament/equipment.service";
import { ProprietaryResponse } from "../models/proprietaries/proprietary";
import { EquipmentResponse, EquipmentRequest } from "../models/equipaments/equipament.model";

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    MatChipsModule,
    MatListModule,
    MatSnackBarModule
  ],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit {
  equipamentoForm: FormGroup;
  proprietaries: ProprietaryResponse[] = [];
  isEdicao = false;
  equipamentoId: string | null = null;
  isVisualizacao = false;
  selectedFiles: File[] = [];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private proprietaryService: ProprietaryService,
    private snackBar: MatSnackBar,
    private equipmentService: EquipamentService
  ) {
    this.equipamentoForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      topo: [null, [Validators.required, Validators.pattern("^[0-9]*$")]],
      proprietaryId: [null, [Validators.required]],
      usageType: ['COLABORADOR', [Validators.required]],
      perParts: this.fb.array([]),
      imageUrls: [[]]
    });
  }

  ngOnInit(): void {
    this.proprietaryService.listAll().subscribe({
      next: (data) => {
        this.proprietaries = data;
        this.equipamentoId = this.route.snapshot.paramMap.get('id');
        this.route.queryParams.subscribe(params => {
          this.isVisualizacao = params['mode'] === 'view';
          if (this.equipamentoId) {
            this.isEdicao = !this.isVisualizacao;
            this.carregarDadosParaEdicao(this.equipamentoId);
          } else {
            this.adicionarPeca();
          }
        });
      },
      error: (err) => console.error('Erro ao carregar proprietários', err)
    });
  }

  get perParts(): FormArray {
    return this.equipamentoForm.get('perParts') as FormArray;
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  adicionarPeca(name = '', serialNumber = ''): void {
    const pecaGroup = this.fb.group({
      name: [name, [Validators.maxLength(50)]],
      serialNumber: [serialNumber]
    });
    this.perParts.push(pecaGroup);
  }

  removerPeca(index: number): void {
    this.perParts.removeAt(index);
    if (this.perParts.length === 0 && !this.isVisualizacao) {
      this.adicionarPeca();
    }
  }

  private carregarDadosParaEdicao(id: string): void {
    this.equipmentService.findById(id).subscribe({
      next: (equipamento: EquipmentResponse) => {
        this.equipamentoForm.patchValue({
          name: equipamento.name,
          description: equipamento.description,
          topo: equipamento.topo,
          usageType: equipamento.usageType,
          imageUrls: equipamento.imageUrls || []
        });

        this.perParts.clear();
        if (equipamento.perParts && equipamento.perParts.length > 0) {
          equipamento.perParts.forEach(part => {
            this.adicionarPeca(part.name, part.serialNumber);
          });
        } else if (!this.isVisualizacao) {
          this.adicionarPeca();
        }

        this.vincularProprietario(equipamento.proprietaryName);

        if (this.isVisualizacao) {
          this.equipamentoForm.disable();
        }
      },
      error: (err: any) => console.error('Erro ao carregar equipamento', err)
    });
  }

  private vincularProprietario(nomeProcurado: string): void {
    const propEncontrado = this.proprietaries.find(p => p.name === nomeProcurado);
    if (propEncontrado) {
      this.equipamentoForm.get('proprietaryId')?.setValue(propEncontrado.id);
    }
  }

  salvar(): void {
    if (this.equipamentoForm.invalid) {
      this.equipamentoForm.markAllAsTouched();
      return;
    }

    const imagensExistentes = this.equipamentoForm.get('imageUrls')?.value || [];
    if (this.selectedFiles.length === 0 && imagensExistentes.length === 0) {
      this.exibirMensagemErro('Você precisa anexar pelo menos uma imagem do equipamento.');
      return;
    }

    const dadosEquipamento: EquipmentRequest = this.equipamentoForm.getRawValue();

    if (dadosEquipamento.perParts) {
      dadosEquipamento.perParts = dadosEquipamento.perParts.filter(
        part => part.name && part.name.trim() !== ''
      );
    }

    const request = (this.isEdicao && this.equipamentoId)
      ? this.equipmentService.update(this.equipamentoId, dadosEquipamento)
      : this.equipmentService.save(dadosEquipamento);

    request.subscribe({
      next: (equipamentoSalvo: EquipmentResponse) => {
        if (this.selectedFiles.length > 0) {
          this.equipmentService.uploadImages(equipamentoSalvo.id, this.selectedFiles).subscribe({
            next: () => this.finalizar(),
            error: (err) => {
              console.error('Erro no upload:', err);
              this.exibirMensagemErro('Equipamento salvo, mas houve um erro ao carregar as imagens.');
              this.finalizar();
            }
          });
        } else {
          this.finalizar();
        }
      },
      error: (err: any) => {
        console.error('Erro no servidor:', err);

        const mensagemDoBackEnd = err.error?.message || 'Erro ao processar operação.';

        this.exibirMensagemErro(mensagemDoBackEnd);
      }
    });
  }

  private exibirMensagemErro(texto: string): void {
    this.snackBar.open(texto, 'Fechar', {
      duration: 10000, 
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'] 
    });
  }

  private finalizar(): void {
    this.router.navigate(['/equipaments']);
  }

  bloquearLetras(event: KeyboardEvent): void {
    const chavesPermitidas = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'
    ];

    if (chavesPermitidas.includes(event.key) ||
      (event.ctrlKey === true) || (event.metaKey === true)) {
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  cancelar(): void {
    this.router.navigate(['/equipaments']);
  }
}