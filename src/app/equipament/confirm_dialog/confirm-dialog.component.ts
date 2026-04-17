import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title style="color: #d32f2f; display: flex; align-items: center; gap: 8px;">
      <mat-icon>report_problem</mat-icon>
      Confirmar Exclusão
    </h2>
    <mat-dialog-content>
      <p>Tem certeza que deseja excluir o equipamento <strong>{{ data.name }}</strong>?</p>
      <p style="font-size: 0.8rem; color: #666;">Esta ação não poderá ser desfeita.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" style="color: #6c757d;">Cancelar</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Excluir Registro</button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { name: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}