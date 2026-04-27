import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreparationLoanComponent } from './preparation-loan.component';

describe('PreparationLoanComponent', () => {
  let component: PreparationLoanComponent;
  let fixture: ComponentFixture<PreparationLoanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreparationLoanComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PreparationLoanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
