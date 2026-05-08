import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../environments/environment';

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
  private readonly API_BASE = environment.apiUrl;

  constructor(
    public dialogRef: MatDialogRef<PhotoGaleryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { urls: string[] }
  ) {}

  onClose(): void {
    this.dialogRef.close();
  }

  resolveImageUrl(raw: string): string {
    if (!raw) return '';
    const url = String(raw).trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;

    const normalized = url.startsWith('/') ? url.slice(1) : url;
    const path = normalized.startsWith('uploads/') ? normalized : `uploads/${normalized}`;

    // Cache-buster para garantir atualização imediata após REPLACE no backend
    return `${this.API_BASE}/${path}?t=${Date.now()}`;
  }

  openImageFull(url: string) {
    const resolved = this.resolveImageUrl(url);
    if (!resolved) return;
    window.open(resolved, '_blank');
  }
}