import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImpuestoModalComponent } from './impuesto-modal.component';

describe('ImpuestoModalComponent', () => {
  let component: ImpuestoModalComponent;
  let fixture: ComponentFixture<ImpuestoModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ImpuestoModalComponent]
    });
    fixture = TestBed.createComponent(ImpuestoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
