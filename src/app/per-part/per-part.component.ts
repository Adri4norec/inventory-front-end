import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { PerPartService } from '../services/per-part/per-part.service';
import { ProprietaryService } from '../services/equipament/proprietary.service';
import { PerPartRequest } from '../models/per-part/per-part.model';
import { ProprietaryResponse } from '../models/proprietaries/proprietary';
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
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ToolbarUserActionsComponent
  ],
  templateUrl: './per-part.component.html',
  styleUrls: ['./per-part.component.css']
})
export class PerPartComponent implements OnInit {
  private static readonly DEFAULT_PROPRIETARY_NAME = 'IRT';

  form!: FormGroup;
  isEdit = false;
  perPartId: string | null = null;
  isSaving = false;
  isChildRecord = false;

  proprietaries: ProprietaryResponse[] = [];
  isLoadingProprietaries = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private perPartService: PerPartService,
    private proprietaryService: ProprietaryService,
    private snackBar: MatSnackBar,
    public layout: LayoutService
  ) { }

  ngOnInit(): void {
    this.perPartId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.perPartId;

    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      quantity: [null as number | null, [Validators.required, Validators.min(1)]],
      proprietaryId: [null as string | null],
      dataVencimento: [null as Date | null]
    });

    this.loadProprietaries();

    if (this.isEdit && this.perPartId) {
      this.perPartService.findById(this.perPartId).subscribe({
        next: (p) => {
          if (p.responsavel != null) {
            this.isChildRecord = true;
            this.snackBar.open(
              'Registros em uso (filhos) não podem ser editados manualmente.',
              'Fechar',
              { duration: 6000 }
            );
            this.router.navigate(['/inventario/acessorios']);
            return;
          }
          this.form.patchValue(
            {
              name: p.name,
              quantity: p.quantity,
              proprietaryId: p.proprietaryId ?? null,
              dataVencimento: this.toDatePickerValue(p.dataVencimento)
            },
            { emitEvent: false }
          );
        },
        error: () => {
          this.router.navigate(['/inventario/acessorios']);
        }
      });
    }
  }

  voltar(): void {
    this.router.navigate(['/inventario/acessorios']);
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving || this.isChildRecord) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const selectedProprietaryId = raw.proprietaryId ? String(raw.proprietaryId) : null;
    const proprietaryId =
      selectedProprietaryId ?? (this.isEdit ? null : this.findDefaultProprietaryId());

    const body: PerPartRequest = {
      name: String(raw.name || '').trim(),
      quantity: Number(raw.quantity),
      proprietaryId,
      dataVencimento: this.toBackendDateTime(raw.dataVencimento)
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
      error: () => {
        this.isSaving = false;
      }
    });
  }

  private loadProprietaries(): void {
    this.isLoadingProprietaries = true;
    this.proprietaryService
      .listAll()
      .pipe(
        catchError(() => {
          this.snackBar.open('Não foi possível carregar a lista de proprietários.', 'Fechar', {
            duration: 5000
          });
          return of<ProprietaryResponse[]>([]);
        })
      )
      .subscribe((list) => {
        this.proprietaries = list ?? [];
        this.isLoadingProprietaries = false;
      });
  }

  private findDefaultProprietaryId(): string | null {
    const target = PerPartComponent.DEFAULT_PROPRIETARY_NAME.toLowerCase();
    return (
      this.proprietaries.find((p) => (p.name ?? '').trim().toLowerCase() === target)?.id ?? null
    );
  }

  private toBackendDateTime(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }

  private toDatePickerValue(iso: string | null | undefined): Date | null {
    if (!iso) return null;
    const datePart = iso.length >= 10 ? iso.substring(0, 10) : iso;
    const [y, m, d] = datePart.split('-').map((n) => Number(n));
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }
}
