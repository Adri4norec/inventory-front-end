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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin, of } from "rxjs";
import { catchError, filter, map, switchMap, tap } from "rxjs/operators";

import { ProprietaryService } from "../services/equipament/proprietary.service";
import { EquipamentService } from "../services/equipament/equipment.service";
import { ProprietaryResponse } from "../models/proprietaries/proprietary";
import { EquipmentResponse, EquipmentRequest } from "../models/equipaments/equipament.model";
import { LayoutService } from "../services/layout/layout.service";
import { environment } from "../../environments/environment";
import { ToolbarUserActionsComponent } from "../shared/toolbar-user-actions/toolbar-user-actions.component";
import { AutocompleteCreateComponent } from "../shared/components/autocomplete-create/autocomplete-create.component";
import { ImageLightboxComponent } from "../shared/components/image-lightbox/image-lightbox.component";

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
    MatDialogModule,
    ToolbarUserActionsComponent,
    AutocompleteCreateComponent
  ],
  templateUrl: './cadastro.component.html',
  styleUrls: ['./cadastro.component.css']
})
export class CadastroComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly equipmentService = inject(EquipamentService);
  private readonly proprietaryService = inject(ProprietaryService);
  public readonly layout = inject(LayoutService);
  private readonly dialog = inject(MatDialog);

  private readonly apiBase = environment.apiUrl;

  equipamentoForm!: FormGroup;
  proprietaries: ProprietaryResponse[] = [];
  selectedFiles: File[] = [];
  previsualizacoes: string[] = [];

  imagensSalvas: Array<{ id: string; url: string }> = [];
  imagensMantidasIds: string[] = [];
  imagensExcluidasIds: string[] = [];

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
      tap(data => {
        this.proprietaries = data;
      }),
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

  removerNovaFoto(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previsualizacoes.splice(index, 1);
  }

  removerFotoSalva(id: string): void {
    this.imagensMantidasIds = this.imagensMantidasIds.filter(mid => mid !== id);
    if (!this.imagensExcluidasIds.includes(id)) {
      this.imagensExcluidasIds.push(id);
    }
    this.imagensSalvas = this.imagensSalvas.filter(img => img.id !== id);
    this.equipamentoForm.get('imageUrls')?.setValue(this.imagensMantidasIds);
  }

  abrirLightbox(imageUrl: string): void {
    if (!imageUrl) return;
    this.dialog.open(ImageLightboxComponent, {
      data: { imageUrl },
      panelClass: 'lightbox-dialog-panel',
      backdropClass: 'lightbox-dialog-backdrop',
      maxWidth: '100vw',
      maxHeight: '100vh',
      width: '100vw',
      height: '100vh'
    });
  }

  get totalFotos(): number {
    return this.imagensSalvas.length + this.previsualizacoes.length;
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

    if (equipamento.imageUrls?.length) {
      this.imagensSalvas = equipamento.imageUrls.map(url => {
        const fullUrl = (url.startsWith('http') || url.startsWith('data:'))
          ? url
          : `${this.apiBase}/uploads/${url}`;
        return { id: url, url: fullUrl };
      });
      this.imagensMantidasIds = equipamento.imageUrls.slice();
      this.imagensExcluidasIds = [];
    }

    this.perParts.clear();
    equipamento.perParts?.forEach(p => this.adicionarPeca(p.name, p.serialNumber));
    if (!this.perParts.length && !this.isVisualizacao) this.adicionarPeca();

    const prop = this.proprietaries.find(p => p.name === equipamento.proprietaryName);
    if (prop) {
      this.equipamentoForm.get('proprietaryId')?.setValue(prop.id);
    }

    if (this.isVisualizacao) this.equipamentoForm.disable();
  }

  salvar(): void {
    if (this.equipamentoForm.invalid) {
      this.equipamentoForm.markAllAsTouched();
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

    const hasImages = this.selectedFiles.length > 0 || this.imagensSalvas.length > 0;

    action$.pipe(
      switchMap(res => hasImages
        ? this.equipmentService.manageImages(res.id, this.imagensMantidasIds, this.selectedFiles).pipe(
          catchError((err) => {
            console.error('Erro ao gerenciar imagens:', err);
            this.showMessage('Erro ao carregar imagens, mas dados salvos.');
            return of(null);
          })
        )
        : of(null)
      )
    ).subscribe({
      next: () => this.router.navigate(['/equipaments']),
      error: (err) => this.handleApiError(err, 'Erro ao salvar equipamento.')
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

  onSearchProprietario(term: string): void {
    this.proprietaryService.listAll().subscribe({
      next: (data) => {
        const trimmed = term?.trim() ?? '';
        this.proprietaries = trimmed
          ? data.filter((p) => p.name.toLowerCase().includes(trimmed.toLowerCase()))
          : data;
      },
      error: () => {
        this.proprietaries = [];
        this.showMessage('Não foi possível carregar a lista de proprietários.');
      },
    });
  }

  onCreateNewProprietario(term: string): void {
    const name = term?.trim();
    if (!name) {
      this.showMessage('Informe o nome do proprietário.');
      return;
    }

    this.proprietaryService.create({ name }).subscribe({
      next: (created) => {
        this.proprietaries = this.mergeProprietary(this.proprietaries, created);
        this.equipamentoForm.get('proprietaryId')?.setValue(created.id);
        this.snackBar.open(`Proprietário "${created.name}" criado com sucesso.`, 'Fechar', {
          duration: 4000,
          verticalPosition: 'top',
        });
      },
      error: (err) => this.handleApiError(err, 'Erro ao criar proprietário.'),
    });
  }

  private handleApiError(err: unknown, fallback: string): void {
    const details = this.equipmentService.normalizeErrorDetails(err);
    const code = details.code ? ` (${details.code})` : '';
    const message = details.message || fallback;
    const violations = this.formatViolations(details.violations);
    const finalMessage = violations ? `${message}${code} — ${violations}` : `${message}${code}`;
    this.showMessage(finalMessage);
  }

  private formatViolations(violations: unknown): string | null {
    if (!violations) return null;

    if (Array.isArray(violations)) {
      return violations
        .map((violation) => {
          if (!violation || typeof violation !== 'object') {
            return String(violation ?? '').trim();
          }

          const record = violation as Record<string, unknown>;
          const field = typeof record['field'] === 'string' ? record['field'] : typeof record['property'] === 'string' ? record['property'] : '';
          const message = typeof record['message'] === 'string' ? record['message'] : typeof record['defaultMessage'] === 'string' ? record['defaultMessage'] : '';
          return field && message ? `${field}: ${message}` : message || String(record).trim();
        })
        .filter(Boolean)
        .join(' • ');
    }

    if (violations && typeof violations === 'object') {
      const entries = Object.entries(violations as Record<string, unknown>);
      return entries
        .map(([field, value]) => {
          const messages = Array.isArray(value) ? value : [value];
          const text = messages
            .map((entry) => String(entry ?? '').trim())
            .filter(Boolean)
            .join('; ');
          return text ? `${field}: ${text}` : field;
        })
        .join(' • ');
    }

    return String(violations).trim();
  }

  private mergeProprietary(
    list: ProprietaryResponse[],
    created: ProprietaryResponse,
  ): ProprietaryResponse[] {
    if (list.some((p) => p.id === created.id)) {
      return list;
    }
    return [...list, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }

  private resolveApiErrorMessage(err: unknown, fallback: string): string {
    const body = (err as { error?: unknown })?.error;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (typeof body === 'object' && body != null && 'message' in body) {
      const message = String((body as { message: unknown }).message).trim();
      if (message) {
        return message;
      }
    }
    return fallback;
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