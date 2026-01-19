import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCfdiPagoModalComponent } from './add-cfdi-pago-modal.component';

describe('AddCfdiPagoModalComponent', () => {
  let component: AddCfdiPagoModalComponent;
  let fixture: ComponentFixture<AddCfdiPagoModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddCfdiPagoModalComponent]
    });
    fixture = TestBed.createComponent(AddCfdiPagoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
