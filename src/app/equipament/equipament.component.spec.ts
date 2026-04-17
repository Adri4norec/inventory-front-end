import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EquipamentComponent } from './equipament.component';

describe('EquipamentComponent', () => {
  let component: EquipamentComponent;
  let fixture: ComponentFixture<EquipamentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EquipamentComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EquipamentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
