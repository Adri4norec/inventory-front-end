import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoGaleryDialogComponent } from './photo-galery-dialog.component';

describe('PhotoGaleryDialogComponent', () => {
  let component: PhotoGaleryDialogComponent;
  let fixture: ComponentFixture<PhotoGaleryDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoGaleryDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoGaleryDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
