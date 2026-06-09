import { AfterViewInit, Component, HostListener, Inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
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
    MatCheckboxModule,
    FormsModule,
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
  equipmentSearchTerm = '';
  filteredAvailableEquipmentIds: string[] = [];
  equipmentPanelOpen = false;

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

  get equipmentInputDisplay(): string {
    if (this.equipmentPanelOpen) {
      return this.equipmentSearchTerm;
    }
    return this.getEquipmentIdsSelectLabel();
  }

  openEquipmentPanel(): void {
    if (this.equipmentPanelOpen) return;
    this.equipmentPanelOpen = true;
    this.equipmentSearchTerm = this.getEquipmentIdsSelectLabel();
    this.refreshFilteredEquipmentIds();
  }

  closeEquipmentPanel(): void {
    if (!this.equipmentPanelOpen) return;
    this.finalizeEquipmentInputFromText(this.equipmentSearchTerm);
    this.equipmentPanelOpen = false;
    this.equipmentSearchTerm = '';
  }

  toggleEquipmentPanel(event: MouseEvent): void {
    event.stopPropagation();
    if (this.equipmentPanelOpen) {
      this.closeEquipmentPanel();
      return;
    }
    this.openEquipmentPanel();
  }

  onEquipmentInputChange(term: string): void {
    if (!this.equipmentPanelOpen) return;
    this.equipmentSearchTerm = term;
    this.syncEquipmentIdsFromInput(term);
    this.refreshFilteredEquipmentIds();
  }

  private parseEquipmentInput(value: string): { committedIds: string[]; filterToken: string } {
    const trimmed = value.trim();
    if (!trimmed) {
      return { committedIds: [], filterToken: '' };
    }

    if (trimmed.endsWith(',')) {
      return {
        committedIds: trimmed
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean),
        filterToken: ''
      };
    }

    const parts = value.split(',');
    if (parts.length === 1) {
      return { committedIds: [], filterToken: parts[0].trim() };
    }

    return {
      committedIds: parts
        .slice(0, -1)
        .map((part) => part.trim())
        .filter(Boolean),
      filterToken: parts[parts.length - 1].trim()
    };
  }

  private syncEquipmentIdsFromInput(value: string): void {
    const { committedIds } = this.parseEquipmentInput(value);
    const validated = this.validateEquipmentIds(committedIds);
    this.form.controls.equipmentIdsMulti.setValue(validated, { emitEvent: false });
    this.form.controls.equipmentIdsMulti.markAsDirty();
  }

  private finalizeEquipmentInputFromText(value: string): void {
    const tokens = value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    const validated = this.validateEquipmentIds(tokens);

    this.form.controls.equipmentIdsMulti.setValue(validated);
    this.form.controls.equipmentIdsMulti.markAsDirty();
    this.form.controls.equipmentIdsMulti.markAsTouched();
  }

  private validateEquipmentIds(ids: string[]): string[] {
    const available = this.data.availableEquipmentIds ?? [];
    const byNormalized = new Map(
      available.map((id) => [String(id).trim().toLowerCase(), String(id).trim()])
    );

    const result: string[] = [];
    for (const id of ids) {
      const match = byNormalized.get(id.trim().toLowerCase());
      if (match && !result.includes(match)) {
        result.push(match);
      }
    }
    return result;
  }

  private syncEquipmentSearchTermFromSelection(): void {
    if (!this.equipmentPanelOpen) return;
    this.equipmentSearchTerm = this.getEquipmentIdsSelectLabel();
    this.refreshFilteredEquipmentIds();
  }

  private refreshFilteredEquipmentIds(): void {
    const { filterToken } = this.parseEquipmentInput(this.equipmentSearchTerm);
    const search = filterToken.trim().toLowerCase();
    const source = this.data.availableEquipmentIds ?? [];

    this.filteredAvailableEquipmentIds = !search
      ? [...source]
      : source.filter((id) => String(id).toLowerCase().includes(search));
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeEquipmentPanel();
  }

  isEquipmentSelected(id: string): boolean {
    return (this.form.controls.equipmentIdsMulti.value ?? []).includes(id);
  }

  toggleEquipmentId(id: string, checked: boolean): void {
    const current = [...(this.form.controls.equipmentIdsMulti.value ?? [])];

    if (checked) {
      if (!current.includes(id)) {
        current.push(id);
      }
    } else {
      const index = current.indexOf(id);
      if (index >= 0) {
        current.splice(index, 1);
      }
    }

    this.form.controls.equipmentIdsMulti.setValue(current);
    this.form.controls.equipmentIdsMulti.markAsDirty();
    this.form.controls.equipmentIdsMulti.markAsTouched();
    this.syncEquipmentSearchTermFromSelection();
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

    this.finalizeEquipmentPanel();

    const value = this.form.getRawValue();
    const equipmentIds = this.extractEquipmentIds(value);

    if (!equipmentIds.length) {
      this.markEquipmentFieldAsInvalid();
      return;
    }

    const { inicioPeriodo, fimPeriodo } = this.validateAndConvertDates(value);
    if (!inicioPeriodo) {
      return;
    }

    const payload: CustodyChangeRequest = {
      equipmentIds,
      collaboratorId: value.collaboratorId,
      inicioPeriodo,
      fimPeriodo
    };

    this.dialogRef.close(payload);
  }

  private finalizeEquipmentPanel(): void {
    if (this.isGeneralMode && this.equipmentPanelOpen) {
      this.finalizeEquipmentInputFromText(this.equipmentSearchTerm);
      this.equipmentPanelOpen = false;
      this.equipmentSearchTerm = '';
    }
  }

  private extractEquipmentIds(value: ReturnType<typeof this.form.getRawValue>): string[] {
    const ids = this.isGeneralMode
      ? value.equipmentIdsMulti ?? []
      : [value.equipmentIdSingle ?? ''];

    return [...new Set(ids.map((id) => String(id).trim()).filter(Boolean))];
  }

  private markEquipmentFieldAsInvalid(): void {
    const control = this.isGeneralMode
      ? this.form.controls.equipmentIdsMulti
      : this.form.controls.equipmentIdSingle;

    control.setErrors({ required: true });
    control.markAsTouched();
  }

  private validateAndConvertDates(value: ReturnType<typeof this.form.getRawValue>): { inicioPeriodo: string | null; fimPeriodo: string | null } {
    const inicioPeriodo = this.toLocalDateTime(value.startAt);
    if (!inicioPeriodo) {
      this.form.controls.startAt.setErrors({ invalidDate: true });
      this.form.controls.startAt.markAsTouched();
      return { inicioPeriodo: null, fimPeriodo: null };
    }

    const fimRaw = value.endAt?.trim();
    const fimPeriodo = fimRaw ? this.toLocalDateTime(fimRaw) : null;

    if (fimRaw && !fimPeriodo) {
      this.form.controls.endAt.setErrors({ invalidDate: true });
      this.form.controls.endAt.markAsTouched();
      return { inicioPeriodo: null, fimPeriodo: null };
    }

    return { inicioPeriodo, fimPeriodo };
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
