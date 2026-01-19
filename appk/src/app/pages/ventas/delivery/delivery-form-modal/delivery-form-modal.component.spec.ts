import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeliveryFormModalComponent } from './delivery-form-modal.component';

describe('DeliveryFormModalComponent', () => {
  let component: DeliveryFormModalComponent;
  let fixture: ComponentFixture<DeliveryFormModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DeliveryFormModalComponent]
    });
    fixture = TestBed.createComponent(DeliveryFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
