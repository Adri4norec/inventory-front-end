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
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>collections</mat-icon>
        Galeria de Fotos
      </h2>
      
      <mat-divider></mat-divider>

      <mat-dialog-content class="gallery-content">
        <div class="photo-grid" *ngIf="data.urls && data.urls.length > 0; else noPhotos">
          <div class="photo-item" *ngFor="let url of data.urls">
            <div class="image-wrapper">
              <img [src]="'http://localhost:8080/uploads/' + url" 
                   [alt]="url"
                   (click)="openImageFull(url)">
            </div>
            <span class="file-name" [matTooltip]="url">{{ url }}</span>
          </div>
        </div>

        <ng-template #noPhotos>
          <div class="empty-state">
            <mat-icon>image_not_supported</mat-icon>
            <p>Nenhuma imagem encontrada para este registro.</p>
          </div>
        </ng-template>
      </mat-dialog-content>

      <mat-divider></mat-divider>

      <mat-dialog-actions align="end">
        <button mat-raised-button color="primary" (click)="onClose()">
          <mat-icon>close</mat-icon>
          Fechar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #3f51b5;
    }
    .gallery-content {
      min-height: 200px;
      padding: 20px !important;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
    }
    .photo-item {
      display: flex;
      flex-direction: column;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      transition: transform 0.2s;
      &:hover {
        transform: translateY(-5px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
    }
    .image-wrapper {
      width: 100%;
      height: 140px;
      overflow: hidden;
      cursor: pointer;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    .file-name {
      padding: 8px;
      font-size: 11px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      background: #f8f9fa;
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #999;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 10px; }
    }
  `]
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