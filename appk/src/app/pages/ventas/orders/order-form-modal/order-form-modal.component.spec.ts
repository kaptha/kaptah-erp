import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderFormModalComponent } from './order-form-modal.component';

describe('OrderFormModalComponent', () => {
  let component: OrderFormModalComponent;
  let fixture: ComponentFixture<OrderFormModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [OrderFormModalComponent]
    });
    fixture = TestBed.createComponent(OrderFormModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
