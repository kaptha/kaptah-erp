import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCfdiNominaModalComponent } from './add-cfdi-nomina-modal.component';

describe('AddCfdiNominaModalComponent', () => {
  let component: AddCfdiNominaModalComponent;
  let fixture: ComponentFixture<AddCfdiNominaModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddCfdiNominaModalComponent]
    });
    fixture = TestBed.createComponent(AddCfdiNominaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
