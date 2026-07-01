import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ImageLightboxComponent } from './image-lightbox.component';

describe('ImageLightboxComponent', () => {
  let component: ImageLightboxComponent;
  let fixture: ComponentFixture<ImageLightboxComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageLightboxComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { images: ['image-1', 'image-2'] } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ImageLightboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and start on the first image', () => {
    expect(component).toBeTruthy();
    expect(component.currentIndex).toBe(0);
    expect(component.currentImage).toBeDefined();
  });

  it('should navigate between images', () => {
    component.next();
    expect(component.currentIndex).toBe(1);

    component.prev();
    expect(component.currentIndex).toBe(0);
  });
});
