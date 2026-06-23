import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  ACCESS_MODULES,
  ModulePermissionLevel,
  PERMISSION_OPTIONS
} from './access-profile.model';

export interface AddProfileDialogData {
  existingNames: string[];
}

export interface AddProfileDialogResult {
  name: string;
  permissions: Record<string, ModulePermissionLevel>;
}

@Component({
  selector: 'app-add-profile-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './add-profile-dialog.component.html',
  styleUrls: ['./add-profile-dialog.component.css']
})
export class AddProfileDialogComponent {
  readonly modules = ACCESS_MODULES;
  readonly permissionOptions = PERMISSION_OPTIONS;

  form = new FormGroup({
    profileName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2), Validators.maxLength(30)]
    }),
    permissions: new FormGroup(
      ACCESS_MODULES.reduce<Record<string, FormControl<ModulePermissionLevel>>>((acc, mod) => {
        acc[mod.key] = new FormControl<ModulePermissionLevel>('ocultar', { nonNullable: true });
        return acc;
      }, {})
    )
  });

  duplicateNameError = false;

  constructor(
    private dialogRef: MatDialogRef<AddProfileDialogComponent, AddProfileDialogResult>,
    @Inject(MAT_DIALOG_DATA) private data: AddProfileDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.duplicateNameError = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const name = this.form.controls.profileName.value.trim();
    const exists = (this.data?.existingNames ?? []).some(
      (existing) => existing.trim().toLowerCase() === name.toLowerCase()
    );

    if (exists) {
      this.duplicateNameError = true;
      this.form.controls.profileName.setErrors({ duplicate: true });
      this.form.controls.profileName.markAsTouched();
      return;
    }

    this.dialogRef.close({
      name,
      permissions: this.form.controls.permissions.getRawValue()
    });
  }

  trackModule(_index: number, mod: { key: string }): string {
    return mod.key;
  }
}
