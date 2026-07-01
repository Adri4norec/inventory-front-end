import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from '../../environments/environment';
import { openImageLightbox } from '../shared/components/image-lightbox/image-lightbox.component';

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
  resolvedUrls: string[] = [];

  constructor(
    public dialogRef: MatDialogRef<PhotoGaleryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { urls: string[] },
    private dialog: MatDialog
  ) {
    const cacheBuster = Date.now();
    this.resolvedUrls = (data.urls ?? []).map(raw => this.buildUrl(raw, cacheBuster));
  }

  onClose(): void {
    this.dialogRef.close();
  }

  private buildUrl(raw: string, t: number): string {
    if (!raw) return '';
    const url = String(raw).trim();
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;

    const normalized = url.startsWith('/') ? url.slice(1) : url;
    const path = normalized.startsWith('uploads/') ? normalized : `uploads/${normalized}`;
    return `${this.API_BASE}/${path}?t=${t}`;
  }

  openImageFull(url: string, index: number): void {
    if (!url) return;
    this.dialogRef.close();
    openImageLightbox(this.dialog, {
      images: this.resolvedUrls,
      initialIndex: index,
    });
  }
}