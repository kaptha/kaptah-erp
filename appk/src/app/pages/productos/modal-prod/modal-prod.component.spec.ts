import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalProdComponent } from './modal-prod.component';

describe('ModalProdComponent', () => {
  let component: ModalProdComponent;
  let fixture: ComponentFixture<ModalProdComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalProdComponent]
    });
    fixture = TestBed.createComponent(ModalProdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
