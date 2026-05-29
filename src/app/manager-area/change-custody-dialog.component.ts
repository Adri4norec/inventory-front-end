import { AfterViewInit, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LoanService } from '../services/loan/loan.service';
import { CustodyChangeRequest, UserSearchResponse } from '../models/loans/loans.model';
import { AutocompleteCreateComponent } from '../shared/components/autocomplete-create/autocomplete-create.component';

export type ChangeCustodyDialogMode = 'general' | 'row';

export interface EquipmentOption {
  id: string;
}

export interface ChangeCustodyDialogData {
  mode: ChangeCustodyDialogMode;
  loanId?: string;
  equipmentId?: string;
  custodianteNome?: string;
  availableEquipmentIds: string[];
}

@Component({
  selector: 'app-change-custody-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    AutocompleteCreateComponent
  ],
  templateUrl: './change-custody-dialog.component.html',
  styleUrls: ['./change-custody-dialog.component.css']
})
export class ChangeCustodyDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  form = new FormGroup({
    equipmentIdsMulti: new FormControl<string[]>([], { nonNullable: true, validators: [Validators.required] }),
    equipmentIdSingle: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    collaboratorId: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    startAt: new FormControl<string>('', { nonNullable: true, validators: [Validators.required] }),
    endAt: new FormControl<string>('', { nonNullable: true })
  });

  filteredUsers: UserSearchResponse[] = [];
  filteredEquipmentOptions: EquipmentOption[] = [];

  private readonly movementCapturedAt = new Date();
  private readonly subs = new Subscription();

  constructor(
    public dialogRef: MatDialogRef<ChangeCustodyDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ChangeCustodyDialogData,
    private loanService: LoanService
  ) {}

  get isGeneralMode(): boolean {
    return this.data?.mode === 'general';
  }

  get isRowMode(): boolean {
    return this.data?.mode === 'row';
  }

  ngOnInit(): void {
    const todayLabel = this.formatBrDate(new Date());

    if (this.isGeneralMode) {
      this.form.controls.equipmentIdSingle.clearValidators();
      this.form.controls.equipmentIdSingle.updateValueAndValidity({ emitEvent: false });
    } else {
      this.form.controls.equipmentIdsMulti.clearValidators();
      this.form.controls.equipmentIdsMulti.updateValueAndValidity({ emitEvent: false });
    }

    const prefill = this.getRowPrefillId();
    if (this.isRowMode && prefill) {
      this.filteredEquipmentOptions = [{ id: prefill }];
      this.form.patchValue({ startAt: todayLabel, equipmentIdSingle: prefill });
    } else {
      this.form.patchValue({ startAt: todayLabel });
    }

    this.onSearchCollaborator('');
  }

  ngAfterViewInit(): void {
    const prefill = this.getRowPrefillId();
    if (!this.isRowMode || !prefill) return;
    this.form.controls.equipmentIdSingle.setValue(prefill);
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  close(): void {
    this.dialogRef.close();
  }

  onDateInput(event: Event, field: 'startAt' | 'endAt'): void {
    const input = event.target as HTMLInputElement;
    const masked = this.applyDateMask(input.value);
    input.value = masked;
    this.form.controls[field].setValue(masked, { emitEvent: false });
    this.form.controls[field].setErrors(null);
  }

  onSearchEquipment(term: string): void {
    const prefill = this.getRowPrefillId();
    this.filteredEquipmentOptions = prefill ? [{ id: prefill }] : [];
  }

  getEquipmentIdsSelectLabel(): string {
    const ids = this.form.controls.equipmentIdsMulti.value ?? [];
    if (!ids.length) {
      return '';
    }
    return ids.join(', ');
  }

  onSearchCollaborator(term: string): void {
    const search = term?.trim() ?? '';
    this.loanService.buscarColaboradores(search || '').pipe(
      catchError(() => of([]))
    ).subscribe((users) => {
      this.filteredUsers = Array.isArray(users) ? users : [];
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const equipmentIds = this.isGeneralMode
      ? (value.equipmentIdsMulti ?? []).map((id) => String(id).trim()).filter(Boolean)
      : [String(value.equipmentIdSingle ?? '').trim()].filter(Boolean);

    if (equipmentIds.length === 0) {
      const control = this.isGeneralMode
        ? this.form.controls.equipmentIdsMulti
        : this.form.controls.equipmentIdSingle;
      control.setErrors({ required: true });
      control.markAsTouched();
      return;
    }

    const inicioPeriodo = this.toLocalDateTime(value.startAt);
    if (!inicioPeriodo) {
      this.form.controls.startAt.setErrors({ invalidDate: true });
      this.form.controls.startAt.markAsTouched();
      return;
    }

    const fimRaw = value.endAt?.trim();
    let fimPeriodo: string | null = null;
    if (fimRaw) {
      fimPeriodo = this.toLocalDateTime(fimRaw);
      if (!fimPeriodo) {
        this.form.controls.endAt.setErrors({ invalidDate: true });
        this.form.controls.endAt.markAsTouched();
        return;
      }
    }

    const payload: CustodyChangeRequest = {
      equipmentIds,
      collaboratorId: value.collaboratorId,
      inicioPeriodo,
      fimPeriodo
    };

    this.dialogRef.close(payload);
  }

  private applyDateMask(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  }

  private formatBrDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  }

  private parseBrDate(value: string): Date | null {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return null;

    const day = Number(match[1]);
    const month = Number(match[2]) - 1;
    const year = Number(match[3]);
    const date = new Date(year, month, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  private getRowPrefillId(): string {
    return String(this.data?.equipmentId ?? '').trim();
  }

  private toLocalDateTime(brDate: string): string | null {
    const date = this.parseBrDate(brDate);
    if (!date) return null;

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(this.movementCapturedAt.getHours()).padStart(2, '0');
    const min = String(this.movementCapturedAt.getMinutes()).padStart(2, '0');

    return `${y}-${m}-${d}T${h}:${min}:00`;
  }

  get movementTimeLabel(): string {
    const h = String(this.movementCapturedAt.getHours()).padStart(2, '0');
    const min = String(this.movementCapturedAt.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
}
