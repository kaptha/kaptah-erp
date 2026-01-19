import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagoFormModalComponent } from './pago-form-modal.component';

describe('PagoFormModalComponent', () => {
  let component: PagoFormModalComponent;
  let fixture: ComponentFixture<PagoFormModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PagoFormModalComponent]
    });
    fixture = TestBed.createComponent(PagoFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
