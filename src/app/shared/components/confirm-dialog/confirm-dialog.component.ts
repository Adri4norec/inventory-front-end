import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  name?: string;
  message?: string;
  detail?: string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  titleColor?: string;
  confirmColor?: 'primary' | 'warn' | 'accent';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title [style.color]="titleColor" style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>{{ icon }}</mat-icon>
      {{ title }}
    </h2>
    <mat-dialog-content>
      <p *ngIf="data.message; else defaultMessage">{{ data.message }}</p>
      <ng-template #defaultMessage>
        <p>Tem certeza que deseja excluir o registro <strong>{{ data.name }}</strong>?</p>
      </ng-template>
      <p *ngIf="detail" style="font-size: 0.8rem; color: #666;">{{ detail }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" style="color: #6c757d;">{{ cancelLabel }}</button>
      <button mat-raised-button [color]="confirmColor" (click)="onConfirm()">{{ confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData,
  ) {}

  get title(): string {
    return this.data.title ?? 'Confirmar Exclusão';
  }

  get confirmLabel(): string {
    return this.data.confirmLabel ?? 'Excluir Registro';
  }

  get cancelLabel(): string {
    return this.data.cancelLabel ?? 'Cancelar';
  }

  get icon(): string {
    return this.data.icon ?? 'report_problem';
  }

  get titleColor(): string {
    return this.data.titleColor ?? '#d32f2f';
  }

  get confirmColor(): 'primary' | 'warn' | 'accent' {
    return this.data.confirmColor ?? 'warn';
  }

  get detail(): string | undefined {
    return this.data.detail ?? (this.data.title ? undefined : 'Esta ação não poderá ser desfeita.');
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
