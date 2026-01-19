import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalCatComponent } from './modal-cat.component';

describe('ModalCatComponent', () => {
  let component: ModalCatComponent;
  let fixture: ComponentFixture<ModalCatComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalCatComponent]
    });
    fixture = TestBed.createComponent(ModalCatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
