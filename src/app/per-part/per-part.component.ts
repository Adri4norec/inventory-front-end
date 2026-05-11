import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { PerPartService } from '../services/per-part/per-part.service';
import { PerPartRequest } from '../models/per-part/per-part.model';
import { LayoutService } from '../services/layout/layout.service';
import { ToolbarUserActionsComponent } from '../shared/toolbar-user-actions/toolbar-user-actions.component';

@Component({
  selector: 'app-per-part',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatToolbarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './per-part.component.html',
  styleUrls: ['./per-part.component.css']
})
export class PerPartComponent implements OnInit {
  private static readonly DEFAULT_RESPONSAVEL = 'IRT';

  form!: FormGroup;
  isEdit = false;
  perPartId: string | null = null;
  isSaving = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private perPartService: PerPartService,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) {}

  ngOnInit(): void {
    this.perPartId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.perPartId;

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      quantity: [null as number | null, [Validators.required, Validators.min(1)]],
      responsavel: ['']
    });

    const respCtrl = this.form.get('responsavel');
    if (this.isEdit) {
      respCtrl?.setValidators([Validators.required, Validators.maxLength(255)]);
    } else {
      respCtrl?.clearValidators();
    }
    respCtrl?.updateValueAndValidity({ emitEvent: false });

    if (this.isEdit && this.perPartId) {
      this.perPartService.findById(this.perPartId).subscribe({
        next: (p) => {
          this.form.patchValue(
            {
              name: p.name,
              responsavel: p.responsavel ?? '',
              quantity: p.quantity
            },
            { emitEvent: false }
          );
        },
        error: (err) => {
          const msg = this.extractBackendMessage(err, 'Acessório não encontrado.');
          this.snackBar.open(msg, 'Fechar', { duration: 6000 });
          this.router.navigate(['/inventario/acessorios']);
        }
      });
    }
  }

  voltar(): void {
    this.router.navigate(['/inventario/acessorios']);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const body: PerPartRequest = {
      name: String(raw.name || '').trim(),
      responsavel: this.isEdit
        ? String(raw.responsavel || '').trim()
        : PerPartComponent.DEFAULT_RESPONSAVEL,
      quantity: Number(raw.quantity)
    };

    this.isSaving = true;
    const req$ =
      this.isEdit && this.perPartId
        ? this.perPartService.update(this.perPartId, body)
        : this.perPartService.create(body);

    req$.subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open(
          this.isEdit ? 'Acessório atualizado com sucesso.' : 'Acessório criado com sucesso.',
          'OK',
          { duration: 3000 }
        );
        this.router.navigate(['/inventario/acessorios']);
      },
      error: (err) => {
        this.isSaving = false;
        const msg = this.extractBackendMessage(err, 'Não foi possível salvar o acessório.');
        this.snackBar.open(msg, 'Fechar', { duration: 6000 });
      }
    });
  }

  private extractBackendMessage(err: unknown, fallback: string): string {
    const e = err as {
      error?: { message?: string };
      message?: string;
      status?: number;
    };
    if (e?.status === 404) {
      return this.formatNotFoundMessage(e?.error?.message);
    }
    return e?.error?.message || e?.message || fallback;
  }

  private formatNotFoundMessage(detail?: string | null): string {
    if (detail && detail.trim()) {
      return detail;
    }
    return 'Acessório não encontrado (PER_PART_NOT_FOUND).';
  }
}
