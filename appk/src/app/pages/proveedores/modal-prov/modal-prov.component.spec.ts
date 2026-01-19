import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalProvComponent } from './modal-prov.component';

describe('ModalProvComponent', () => {
  let component: ModalProvComponent;
  let fixture: ComponentFixture<ModalProvComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalProvComponent]
    });
    fixture = TestBed.createComponent(ModalProvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
