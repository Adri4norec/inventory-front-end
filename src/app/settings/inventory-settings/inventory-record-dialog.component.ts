import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export type InventoryRecordType = 'category' | 'proprietary' | 'project';

export interface InventoryRecordDialogData {
  mode: 'create' | 'edit';
  defaultType?: InventoryRecordType;
  type?: InventoryRecordType;
  name?: string;
  existingNames?: string[];
}

export interface InventoryRecordDialogResult {
  type: InventoryRecordType;
  name: string;
}

@Component({
  selector: 'app-inventory-record-dialog',
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
  ],
  templateUrl: './inventory-record-dialog.component.html',
  styleUrls: ['./inventory-record-dialog.component.css'],
})
export class InventoryRecordDialogComponent {
  readonly typeOptions: { value: InventoryRecordType; label: string }[] = [
    { value: 'category', label: 'Categoria' },
    { value: 'proprietary', label: 'Proprietário' },
    { value: 'project', label: 'Projeto' },
  ];

  readonly isEdit = this.data.mode === 'edit';

  form = new FormGroup({
    type: new FormControl<InventoryRecordType>(
      this.data.type ?? this.data.defaultType ?? 'category',
      { nonNullable: true, validators: [Validators.required] }
    ),
    name: new FormControl(this.data.name ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(120)],
    }),
  });

  constructor(
    private dialogRef: MatDialogRef<InventoryRecordDialogComponent, InventoryRecordDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: InventoryRecordDialogData
  ) {
    if (this.isEdit) {
      this.form.controls.type.disable();
    }
  }

  get dialogTitle(): string {
    return this.isEdit ? 'Editar registro' : 'Novo registro';
  }

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const name = this.form.controls.name.value.trim();
    const type = this.form.controls.type.getRawValue();
    const originalName = (this.data.name ?? '').trim().toLowerCase();

    const duplicate = (this.data.existingNames ?? []).some((existing) => {
      const normalized = existing.trim().toLowerCase();
      if (this.isEdit && normalized === originalName) {
        return false;
      }
      return normalized === name.toLowerCase();
    });

    if (duplicate) {
      this.form.controls.name.setErrors({ duplicate: true });
      this.form.controls.name.markAsTouched();
      return;
    }

    this.dialogRef.close({ type, name });
  }
}
