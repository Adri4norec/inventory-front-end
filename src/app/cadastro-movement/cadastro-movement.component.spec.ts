import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastroMovementComponent } from './cadastro-movement.component';

describe('CadastroMovementComponent', () => {
  let component: CadastroMovementComponent;
  let fixture: ComponentFixture<CadastroMovementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroMovementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CadastroMovementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
