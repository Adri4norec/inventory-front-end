import { Component, HostListener, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ImageLightboxData {
  images?: string[];
  imageUrl?: string;
  initialIndex?: number;
}

export function openImageLightbox(
  dialog: MatDialog,
  data: ImageLightboxData
): MatDialogRef<ImageLightboxComponent> {
  return dialog.open(ImageLightboxComponent, {
    data,
    panelClass: 'lightbox-dialog-panel',
    width: '1100px',
    maxWidth: '94vw',
    maxHeight: '90vh',
    autoFocus: false,
  });
}

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="lightbox-shell">
      <div class="lightbox-header">
        <div class="lightbox-title">
          <mat-icon class="lightbox-title-icon">photo_library</mat-icon>
          <span>Visualização de imagem</span>
          <span class="lightbox-counter" *ngIf="resolvedImages.length > 1">
            {{ currentIndex + 1 }} / {{ resolvedImages.length }}
          </span>
        </div>
        <button mat-icon-button type="button" (click)="close()" aria-label="Fechar visualização">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="lightbox-body">
        <button
          mat-mini-fab
          type="button"
          class="lightbox-nav lightbox-nav-prev"
          [disabled]="!hasPrev"
          (click)="prev()"
          aria-label="Imagem anterior">
          <mat-icon>chevron_left</mat-icon>
        </button>

        <div class="lightbox-image-wrapper">
          <img *ngIf="currentImage" [src]="currentImage" alt="Imagem ampliada" class="lightbox-image" />
          <div *ngIf="!currentImage" class="lightbox-empty-state">
            <mat-icon>image_not_supported</mat-icon>
            <span>Nenhuma imagem disponível</span>
          </div>
        </div>

        <button
          mat-mini-fab
          type="button"
          class="lightbox-nav lightbox-nav-next"
          [disabled]="!hasNext"
          (click)="next()"
          aria-label="Próxima imagem">
          <mat-icon>chevron_right</mat-icon>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      border-radius: var(--app-dialog-border-radius, 16px);
      overflow: hidden;
    }

    .lightbox-shell {
      width: 100%;
      background: #fff;
      overflow: hidden;
    }

    .lightbox-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 20px 20px 12px 24px;
      border-bottom: 1px solid #eef2f9;
    }

    .lightbox-title {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 600;
      color: #0b1c33;
      min-width: 0;
    }

    .lightbox-title-icon {
      color: #2f76c7;
    }

    .lightbox-counter {
      margin-left: 4px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #64748b;
    }

    .lightbox-body {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px 20px 24px;
      box-sizing: border-box;
    }

    .lightbox-nav {
      flex: 0 0 auto;
      background: #f1f5f9 !important;
      color: #1f3255 !important;
      width: 44px;
      height: 44px;
      min-width: 44px;
      min-height: 44px;
      box-shadow: none !important;
    }

    .lightbox-nav[disabled] {
      opacity: 0.35;
    }

    .lightbox-image-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1 1 auto;
      width: 100%;
      min-width: 0;
      height: min(68vh, 720px);
      min-height: min(68vh, 720px);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
    }

    .lightbox-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .lightbox-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #64748b;
      padding: 48px 32px;
      gap: 8px;
    }

    @media (max-width: 720px) {
      .lightbox-header {
        padding: 16px 12px 10px 16px;
      }

      .lightbox-title {
        font-size: 17px;
      }

      .lightbox-body {
        padding: 12px 12px 16px;
        gap: 8px;
      }

      .lightbox-nav {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
      }

      .lightbox-image-wrapper {
        height: 58vh;
        min-height: 58vh;
      }
    }
  `],
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
    this.currentIndex = Math.min(
      Math.max(data.initialIndex ?? 0, 0),
      Math.max(this.resolvedImages.length - 1, 0)
    );
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
