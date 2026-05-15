import { Component, OnInit, inject } from "@angular/core";
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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { forkJoin, of } from "rxjs";
import { catchError, filter, map, switchMap, tap } from "rxjs/operators";

import { ProprietaryService } from "../services/equipament/proprietary.service";
import { EquipamentService } from "../services/equipament/equipment.service";
import { ProprietaryResponse } from "../models/proprietaries/proprietary";
import { EquipmentResponse, EquipmentRequest } from "../models/equipaments/equipament.model";
import { LayoutService } from "../services/layout/layout.service";
import { environment } from "../../environments/environment";
import { ToolbarUserActionsComponent } from "../shared/toolbar-user-actions/toolbar-user-actions.component";

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
    MatSnackBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.scss']
})
export class CadastroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly equipmentService = inject(EquipamentService);
  private readonly proprietaryService = inject(ProprietaryService);
  public readonly layout = inject(LayoutService);

  private readonly apiBase = environment.apiUrl;
  
  equipamentoForm!: FormGroup;
  proprietaries: ProprietaryResponse[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];
  
  isEdicao = false;
  isVisualizacao = false;
  equipamentoId: string | null = null;

  ngOnInit(): void {
    this.initForm();
    this.loadInitialData();
  }

  private initForm(): void {
    this.equipamentoForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      topo: [null, Validators.pattern("^[0-9]*$")],
      categoria: ['', Validators.required],
      proprietaryId: [null, Validators.required],
      usageType: ['', Validators.required],
      dueDate: [null as Date | null],
      perParts: this.fb.array([]),
      imageUrls: [[]]
    });
  }

  private loadInitialData(): void {
    this.proprietaryService.listAll().pipe(
      tap(data => this.proprietaries = data),
      switchMap(() => this.route.paramMap),
      map(params => params.get('id')),
      tap(id => this.equipamentoId = id),
      switchMap(id => id ? this.equipmentService.findById(id) : of(null)),
      switchMap(equipamento => this.route.queryParams.pipe(
        map(params => ({ equipamento, mode: params['mode'] }))
      ))
    ).subscribe(({ equipamento, mode }) => {
      this.isVisualizacao = mode === 'view';
      this.isEdicao = !!equipamento && !this.isVisualizacao;

      if (equipamento) {
        this.fillForm(equipamento);
      } else {
        this.adicionarPeca();
      }
    });
  }

  get perParts(): FormArray {
    return this.equipamentoForm.get('perParts') as FormArray;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.selectedFiles.push(...files);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => this.previsualizacoes.push(e.target?.result as string);
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removerArquivo(index: number): void {
    const removido = this.previsualizacoes[index];
    this.previsualizacoes.splice(index, 1);

    if (removido.startsWith('data:')) {
      this.selectedFiles.splice(index, 1);
    } else {
      const currentUrls = this.equipamentoForm.get('imageUrls')?.value as string[];
      this.equipamentoForm.get('imageUrls')?.setValue(currentUrls.filter(url => !removido.endsWith(url)));
    }
  }

  adicionarPeca(name = '', serialNumber = ''): void {
    this.perParts.push(this.fb.group({
      name: [name, Validators.maxLength(50)],
      serialNumber: [serialNumber]
    }));
  }

  removerPeca(index: number): void {
    this.perParts.removeAt(index);
    if (this.perParts.length === 0 && !this.isVisualizacao) this.adicionarPeca();
  }

  private fillForm(equipamento: EquipmentResponse): void {
    this.equipamentoForm.patchValue({
      ...equipamento,
      dueDate: this.toDatePickerValue(equipamento.dueDate)
    });
    
    if (equipamento.imageUrls) {
      this.previsualizacoes = equipamento.imageUrls.map(url => 
        (url.startsWith('http') || url.startsWith('data:')) ? url : `${this.apiBase}/uploads/${url}`
      );
    }

    this.perParts.clear();
    equipamento.perParts?.forEach(p => this.adicionarPeca(p.name, p.serialNumber));
    if (!this.perParts.length && !this.isVisualizacao) this.adicionarPeca();

    const prop = this.proprietaries.find(p => p.name === equipamento.proprietaryName);
    if (prop) this.equipamentoForm.get('proprietaryId')?.setValue(prop.id);

    if (this.isVisualizacao) this.equipamentoForm.disable();
  }

  salvar(): void {
    if (this.equipamentoForm.invalid) {
      this.equipamentoForm.markAllAsTouched();
      return;
    }

    if (!this.selectedFiles.length && !this.equipamentoForm.get('imageUrls')?.value?.length) {
      this.showMessage('Anexe pelo menos uma imagem.');
      return;
    }

    const raw = this.equipamentoForm.getRawValue();
    const payload: EquipmentRequest & Record<string, unknown> = {
      ...raw,
      dueDate: this.toBackendDate(raw.dueDate),
      perParts: raw.perParts.filter((p: { name?: string }) => p.name?.trim())
    };

    const action$ = (this.isEdicao && this.equipamentoId)
      ? this.equipmentService.update(this.equipamentoId, payload)
      : this.equipmentService.save(payload);

    action$.pipe(
      switchMap(res => this.selectedFiles.length 
        ? this.equipmentService.uploadImages(res.id, this.selectedFiles).pipe(
            catchError(() => {
              this.showMessage('Erro ao carregar imagens, mas dados salvos.');
              return of(null);
            })
          )
        : of(null)
      )
    ).subscribe({
      next: () => this.router.navigate(['/equipaments']),
      error: (err) => this.showMessage(err.error?.message || 'Erro no servidor')
    });
  }

  showMessage(text: string): void {
    this.snackBar.open(text, 'Fechar', { duration: 5000, verticalPosition: 'top', panelClass: ['error-snackbar'] });
  }

  cancelar(): void {
    this.router.navigate(['/equipaments']);
  }

  private toBackendDate(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  private toDatePickerValue(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const datePart = iso.length >= 10 ? iso.substring(0, 10) : iso;
    const [y, m, d] = datePart.split('-').map((n) => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  bloquearLetras(event: KeyboardEvent): void {
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];
    if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return;
    if (!/^[0-9]$/.test(event.key)) event.preventDefault();
  }
}