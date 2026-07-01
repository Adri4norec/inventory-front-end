import { Component, HostListener, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImageLightboxData {
  images?: string[];
  imageUrl?: string;
  initialIndex?: number;
}

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="lightbox-backdrop" (click)="close()">
      <div class="lightbox-container" (click)="$event.stopPropagation()">
        <button mat-mini-fab class="lightbox-close" (click)="close(); $event.stopPropagation()">
          <mat-icon>close</mat-icon>
        </button>

        <button mat-mini-fab class="lightbox-nav lightbox-nav-prev" [disabled]="!hasPrev" (click)="prev(); $event.stopPropagation()">
          <mat-icon>chevron_left</mat-icon>
        </button>

        <div class="lightbox-image-wrapper">
          <img *ngIf="currentImage" [src]="currentImage" alt="Imagem ampliada" class="lightbox-image" />
          <div *ngIf="!currentImage" class="lightbox-empty-state">
            <mat-icon>image_not_supported</mat-icon>
            <span>Nenhuma imagem disponível</span>
          </div>
        </div>

        <button mat-mini-fab class="lightbox-nav lightbox-nav-next" [disabled]="!hasNext" (click)="next(); $event.stopPropagation()">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>

      <div class="lightbox-footer" *ngIf="resolvedImages.length > 1">
        <span>{{ currentIndex + 1 }} / {{ resolvedImages.length }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .lightbox-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.92);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 24px;
      box-sizing: border-box;
      cursor: pointer;
    }
    .lightbox-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      max-width: 1200px;
      max-height: 90vh;
      gap: 16px;
      cursor: default;
    }
    .lightbox-close {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 10;
      background: rgba(0, 0, 0, 0.65) !important;
      color: #fff !important;
    }
    .lightbox-nav {
      background: rgba(0, 0, 0, 0.65) !important;
      color: #fff !important;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
    }
    .lightbox-image-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: min(100%, 1040px);
      max-height: 84vh;
      background: #121212;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
    }
    .lightbox-image {
      max-width: 100%;
      max-height: 84vh;
      object-fit: contain;
      display: block;
    }
    .lightbox-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #fff;
      padding: 32px;
      gap: 8px;
    }
    .lightbox-footer {
      margin-top: 16px;
      color: #fff;
      font-size: 0.95rem;
      letter-spacing: 0.02em;
    }
  `]
})
export class ImageLightboxComponent {
  public resolvedImages: string[] = [];
  public currentIndex = 0;

  constructor(
    public dialogRef: MatDialogRef<ImageLightboxComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageLightboxData
  ) {
    const rawImages = data.images ?? (data.imageUrl ? [data.imageUrl] : []);
    this.resolvedImages = rawImages.filter((url): url is string => !!url);
    this.currentIndex = Math.min(Math.max(data.initialIndex ?? 0, 0), this.resolvedImages.length - 1);
  }

  get currentImage(): string {
    return this.resolvedImages[this.currentIndex] ?? '';
  }

  get hasPrev(): boolean {
    return this.currentIndex > 0;
  }

  get hasNext(): boolean {
    return this.currentIndex < this.resolvedImages.length - 1;
  }

  next(): void {
    if (this.hasNext) {
      this.currentIndex += 1;
    }
  }

  prev(): void {
    if (this.hasPrev) {
      this.currentIndex -= 1;
    }
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.close();
      return;
    }
    if (event.key === 'ArrowRight') {
      this.next();
      event.preventDefault();
    }
    if (event.key === 'ArrowLeft') {
      this.prev();
      event.preventDefault();
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
