import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanPreparationComponent } from './loan-preparation.component';

describe('LoanPreparationComponent', () => {
  let component: LoanPreparationComponent;
  let fixture: ComponentFixture<LoanPreparationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoanPreparationComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LoanPreparationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
