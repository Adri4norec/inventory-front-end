import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-photo-galery-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
  ],
  templateUrl: './photo-galery-dialog.component.html',
  styleUrls: ['./photo-galery-dialog.component.css']
})
export class PhotoGaleryDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<PhotoGaleryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { urls: string[] }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  openImageFull(url: string) {
    window.open(`http://localhost:8080/uploads/${url}`, '_blank');
  }
}