import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImageLightboxData {
  imageUrl: string;
}

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="lightbox-backdrop" (click)="close()">
      <button mat-mini-fab class="lightbox-close" (click)="close(); $event.stopPropagation()">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.imageUrl" alt="Imagem ampliada" class="lightbox-image"
           (click)="$event.stopPropagation()" />
    </div>
  `,
  styles: [`
    :host { display: block; }
    .lightbox-backdrop {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      cursor: pointer;
      position: relative;
    }
    .lightbox-close {
      position: absolute;
      top: 12px;
      right: 12px;
      z-index: 10;
      background: rgba(0,0,0,.55) !important;
      color: #fff !important;
    }
    .lightbox-image {
      max-width: 90vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4);
      cursor: default;
    }
  `]
})
export class ImageLightboxComponent {
  constructor(
    public dialogRef: MatDialogRef<ImageLightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageLightboxData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
